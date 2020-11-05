# docx2pdf-converter
Convert from docx files to PDF, get thumbnails for file previews.

Built with:
* Node.js 
* Express.js 
* PDFTron Node.js SDK
 
## Installation
Clone the repo and run:

####   npm start

The server will be listening on port 3000. http://localhost:3000
## API Calls

### Convert to PDF
The endpoint returns the requested file and automatically create a thumbnail. Thumbnail can be seen in thumbs folder.

HTTP Request 

 `GET http://localhost:3000/convertToPdf/:filename`

### Convert file from cloud
The endpoint returns the requested file and automatically create a thumbnail. Both thumnail and pdf document is uploaded back to cloud storage.

HTTP Request 

 `GET http://localhost:3000/convertFileFromCloud/:filename`