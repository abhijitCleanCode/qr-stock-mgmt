import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";

import { traceMiddleware } from "./app/middlewares/trace.middleware.js";
import requestTiming from "./app/middlewares/requestTiming.middleware.js";
import notFoundHandler from "./app/middlewares/notFound.middleware.js";
import errorHandler from "./app/middlewares/error.middleware.js";
import router from "./app/routes/index.js";

const app = express();

app.set('trust proxy', 1);

app.disable('x-powered-by');
app.use(helmet());

// cors
app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:5173", credentials: true }));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(traceMiddleware);
app.use(requestTiming);

app.get("/health", (req, res) => { res.json({ status: "User service running" }) });

// application routes
app.use("/api/v1", router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
