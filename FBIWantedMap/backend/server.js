const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
    res.send('Hello World from Backend!');
});

app.get('/data', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/dbtest.json'));
});


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

