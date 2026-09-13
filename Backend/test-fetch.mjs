import dotenv from "dotenv";
dotenv.config();

const HF_API_KEY = process.env.HF_API_KEY;

async function checkModel(model) {
    try {
        const response = await fetch("https://router.huggingface.co/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${HF_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model,
                temperature: 0.2,
                messages: [{ role: "user", content: "Hello" }]
            }),
        });
        console.log(model, response.status);
        if (!response.ok) {
            console.log(await response.text());
        }
    } catch (e) {
        console.log(model, "Error", e.message);
    }
}

async function testApi() {
    await checkModel("meta-llama/Llama-3.2-3B-Instruct");
    await checkModel("meta-llama/Llama-3.1-8B-Instruct");
    await checkModel("google/gemma-7b-it");
    await checkModel("Qwen/Qwen2.5-Coder-32B-Instruct");
}
testApi();
