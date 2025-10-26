import app from "./index";
const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`✅ Server is running at http://localhost:${PORT}`);
});
