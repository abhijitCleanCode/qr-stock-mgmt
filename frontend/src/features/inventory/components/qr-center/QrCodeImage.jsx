import { QRCodeCanvas } from "qrcode.react";

// Single place that decides how this app renders a QR — size scales with the caller, but
// error-correction level and margin stay fixed so every downloaded/printed QR is generated
// the same way. Canvas (not SVG) so a preview/print caller can also read pixel data off it
// via canvasRef for PNG download (canvas.toDataURL).
const QrCodeImage = ({ value, size = 160, canvasRef, className }) => (
  <QRCodeCanvas ref={canvasRef} value={value} size={size} level="M" marginSize={2} className={className} />
);

export default QrCodeImage;
