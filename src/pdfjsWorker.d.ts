// pdf.js's worker, served by the app itself (vite turns "?url" into its address).
declare module "pdfjs-dist/build/pdf.worker.min.mjs?url" { const url: string; export default url; }
