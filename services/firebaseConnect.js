const firebase = require('firebase');
const firebaseConfig = require("./firebaseConfig");

const app = firebase.initializeApp({
    apiKey: firebaseConfig.apiKey,
    databaseURL: firebaseConfig.databaseURL,
    authDomain: firebaseConfig.authDomain
})

module.exports = app;