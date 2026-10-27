import express from 'express';
import gateway from '../api/gateway';
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'4mb'}));app.all('/api/gateway',gateway);app.listen(8788,'127.0.0.1',()=>console.log('FarmMech backend: http://127.0.0.1:8788'));
