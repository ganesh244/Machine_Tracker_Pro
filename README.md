<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a7e7396c-9640-4460-87b2-b79011684276

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in `.env.local` (if used by your build) to your Gemini API key
3. Configure Firebase + Cloudinary in `.env.local`:
   - `VITE_FIREBASE_*` should match your Firebase Web App config
   - `VITE_FIREBASE_DATABASE_ID` should usually be `(default)`
   - `VITE_CLOUDINARY_CLOUD_NAME` and `VITE_CLOUDINARY_UPLOAD_PRESET` are used for media uploads
4. Create the Cloud Firestore database (one-time) in Firebase Console:
   - Open Firebase Console for your project
   - Go to Build -> Firestore Database
   - Click Create database
   - Choose a region (pick the one closest to your users)
   - This avoids the runtime error: "Firestore: Database '(default)' not found"
5. Run the app:
   `npm run dev`

Notes:
- This app uses a simple email-based login and does not use Firebase Auth. For production deployments, you should add real authentication and lock down Firestore security rules.
- Images/audio/video are stored in Cloudinary; Firestore stores the structured data plus Cloudinary URLs.
