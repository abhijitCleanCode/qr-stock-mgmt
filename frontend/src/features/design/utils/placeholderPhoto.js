// A plain "Photo pending" image, made in the browser. Bulk import gives every variant this image
// until its real photo is added from the design's edit screen.
export async function createPlaceholderPhoto() {
  const canvas = document.createElement("canvas");
  canvas.width = 600;
  canvas.height = 800;

  const context = canvas.getContext("2d");
  context.fillStyle = "#F1F5F9";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#64748B";
  context.font = "bold 40px sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("Photo pending", canvas.width / 2, canvas.height / 2);

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return new File([blob], "photo-pending.png", { type: "image/png" });
}
