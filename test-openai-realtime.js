// test-openai-realtime.js - Test específico para Realtime API
import dotenv from "dotenv";

dotenv.config();

async function testRealtimeAPI() {
    const apiKey = process.env.OPENAI_API_KEY;
    
    console.log('🔑 Testing OpenAI Realtime API...');
    console.log('API Key configured:', !!apiKey);
    console.log('API Key length:', apiKey ? apiKey.length : 0);
    
    if (!apiKey) {
        console.error('❌ No API key found');
        return;
    }
    
    try {
        console.log('🧪 Testing basic OpenAI API access...');
        
        // Test 1: Basic API access
        const modelsResponse = await fetch("https://api.openai.com/v1/models", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
            }
        });
        
        if (!modelsResponse.ok) {
            const error = await modelsResponse.text();
            console.error('❌ Basic API access failed:', error);
            return;
        }
        
        console.log('✅ Basic API access works');
        
        // Test 2: Realtime API access
        console.log('🧪 Testing Realtime API access...');
        
        const realtimeResponse = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-realtime-preview-2024-10-01",
                voice: "alloy",
            }),
        });
        
        console.log('Realtime API Response Status:', realtimeResponse.status);
        
        if (!realtimeResponse.ok) {
            const errorText = await realtimeResponse.text();
            console.error('❌ Realtime API failed:', {
                status: realtimeResponse.status,
                statusText: realtimeResponse.statusText,
                error: errorText
            });
            
            if (realtimeResponse.status === 403) {
                console.log('💡 This means you don\'t have access to the Realtime API yet');
                console.log('💡 You need to request beta access from OpenAI');
            }
            return;
        }
        
        const data = await realtimeResponse.json();
        console.log('✅ Realtime API works!', data);
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

testRealtimeAPI();
