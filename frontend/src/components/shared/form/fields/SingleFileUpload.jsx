import { FileText, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Controller } from "react-hook-form";

const SingleFileUpload = ({
    name,
    control,
    accept = {
        "image/*": [],
        "application/pdf": [".pdf"],
        "application/vnd.ms-excel": [".xls"],
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
            ".xlsx",
        ],
        "text/csv": [".csv"],
    },
    label = "Upload File",
    required = false,
}) => {
    const [previewUrl, setPreviewUrl] = useState(null);

    const generatePreview = (file) => {
        if (file.type.startsWith("image/") || file.type === "application/pdf") {
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
        } else {
            setPreviewUrl(null);
        }
    };

    const cleanupPreview = () => {
        if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
        }
        setPreviewUrl(null);
    };

    const onDrop = useCallback(
        (acceptedFiles, onChange) => {
            const file = acceptedFiles[0];

            if (!file) return;

            cleanupPreview();
            generatePreview(file);
            onChange(file);
        },
        [previewUrl]
    );

    useEffect(() => {
        return () => {
            cleanupPreview();
        };
    }, []);

    return (
        <Controller
            control={control}
            name={name}
            rules={{
                required: required ? "File is required" : false,
            }}
            render={({ field: { onChange, value }, fieldState: { error } }) => {
                const { getRootProps, getInputProps, isDragActive } =
                    useDropzone({
                        onDrop: (files) => onDrop(files, onChange),
                        accept,
                        multiple: false,
                    });

                const file = value;

                return (
                    <div className="mb-4">
                        <label className="block mb-2 font-medium text-sm text-[#1E293B]">
                            {label}
                        </label>

                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded p-4 text-center cursor-pointer transition ${isDragActive
                                ? "border-[#00694C] bg-[#00694C]/5"
                                : "border-[#00694C] hover:border-[#00694C]/70"
                                }`}
                        >
                            <Upload
                                size={24}
                                strokeWidth={2}
                                color="#1E293B"
                                className="mx-auto mb-2"
                            />

                            <input {...getInputProps()} />

                            {isDragActive ? (
                                <p>Drop the file here...</p>
                            ) : (
                                <p>
                                    <span className="text-[#1E293B]">
                                        Click to upload
                                    </span>{" "}
                                    or <strong className="text-[#00694C]">Drag & Drop</strong>
                                </p>
                            )}
                        </div>

                        {file && (
                            <div className="mt-3">
                                <p className="text-sm text-gray-700">
                                    {file.name} —{" "}
                                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                                </p>

                                {file.type.startsWith("image/") && previewUrl && (
                                    <img
                                        src={previewUrl}
                                        alt="preview"
                                        className="mt-2 h-24 object-contain rounded border"
                                    />
                                )}

                                {file.type === "application/pdf" && previewUrl && (
                                    <a
                                        href={previewUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-4 flex gap-2 items-center text-blue-600 underline text-sm"
                                    >
                                        <FileText size={20} className="shrink-0" />
                                        Preview PDF
                                    </a>
                                )}

                                {(file.name.endsWith(".xls") ||
                                    file.name.endsWith(".xlsx") ||
                                    file.name.endsWith(".csv")) && (
                                        <a
                                            href={URL.createObjectURL(file)}
                                            download={file.name}
                                            className="mt-2 inline-block text-green-600 underline text-sm"
                                        >
                                            📊 Download Excel
                                        </a>
                                    )}
                            </div>
                        )}

                        {error && (
                            <p className="text-red-500 text-xs mt-1">
                                {error.message}
                            </p>
                        )}
                    </div>
                );
            }}
        />
    )
}

export default SingleFileUpload
