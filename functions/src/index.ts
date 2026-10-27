import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

admin.initializeApp();
const db = getFirestore();

// 1. ADMIN USER CREATION
export const createTeamMember = functions.https.onCall(async (request) => {
  const { auth, data } = request;
  
  if (!auth || auth.token.role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can create users.');
  }

  const { email, password, displayName, role } = data;

  if (!email || !password || !displayName || !role) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required fields.');
  }

  try {
    const userRecord = await getAuth().createUser({
      email,
      password,
      displayName,
    });

    await getAuth().setCustomUserClaims(userRecord.uid, { role });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      displayName,
      role,
      createdAt: FieldValue.serverTimestamp()
    });

    return { success: true, uid: userRecord.uid };
  } catch (error: any) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// 2. PUBLIC SCAN FLOW
export const processPublicScan = functions.https.onCall(async (request) => {
  const { data } = request;
  const { machineId, actionType, payload } = data;

  if (!machineId || !actionType || !payload) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required payload data.');
  }

  const planterRef = db.collection('planters').doc(machineId);
  const planterSnap = await planterRef.get();

  if (!planterSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Machine not found.');
  }

  const planter = planterSnap.data()!;

  if (actionType === 'onboarding') {
    const { initialOperator, cfJf, location, imageUrl } = payload;
    
    if (!initialOperator || !cfJf || !location) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing fields for onboarding.');
    }

    if (planter.status !== 'registered_unused') {
      throw new functions.https.HttpsError('failed-precondition', 'Machine is already in use.');
    }

    // Update the Planter document
    await planterRef.update({
      status: 'in_use',
      currentCustodian: initialOperator,
      cfJf: cfJf,
      location: location
    });

    // Write Usage Log
    await planterRef.collection('usageLogs').add({
      type: 'onboarding',
      timestamp: new Date().toISOString(),
      farmerName: initialOperator,
      initialOperator: initialOperator,
      cfJf,
      handoverTo: initialOperator,
      location,
      imageUrl: imageUrl || null
    });

    return { success: true };
  } else if (actionType === 'handover') {
    const { farmerName, cropType, acresCovered, cfJf, location, imageUrl } = payload;
    
    if (!farmerName || !cfJf || !location || !cropType || typeof acresCovered !== 'number') {
      throw new functions.https.HttpsError('invalid-argument', 'Missing fields for handover.');
    }

    const previousCustodian = planter.currentCustodian;
    const now = new Date().toISOString();

    const logsSnap = await planterRef.collection('usageLogs').orderBy('timestamp', 'desc').limit(1).get();
    if (!logsSnap.empty) {
      const lastLog = logsSnap.docs[0];
      const lastLogData = lastLog.data();
      if (!lastLogData.usageEndDate) {
        await lastLog.ref.update({
          usageEndDate: now
        });
      }
    }

    await planterRef.update({
      status: 'in_use',
      currentCustodian: farmerName,
      cfJf: cfJf,
      location: location
    });

    await planterRef.collection('usageLogs').add({
      type: 'handover',
      timestamp: now,
      usageStartDate: now,
      farmerName,
      cropType,
      acresCovered,
      cfJf,
      handoverFrom: previousCustodian,
      handoverTo: farmerName,
      location,
      imageUrl: imageUrl || null
    });

    return { success: true };
  } else {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid action type.');
  }
});
