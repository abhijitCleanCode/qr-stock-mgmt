import multer from "multer";

const storage = multer.memoryStorage();

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
const MAX_RESUME_SIZE = 5 * 1024 * 1024; // 5MB

const fileFilter = (req, file, cb) => {

}

const upload = multer({
    storage,

    // fileFilter,

    limits: {
        fileSize: MAX_VIDEO_SIZE,
    },
});

export default upload;
