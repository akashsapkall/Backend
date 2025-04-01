import multer from 'multer';
// import path from 'path';

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, `./public/temp/`)
    },
    filename: function (req, file, cb) {
        const fileName = `${Date.now()}_${file.originalname}`;
        cb(null, fileName)
    }
});

export const upload=multer({ storage, })