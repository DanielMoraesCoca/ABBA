async function testChannels() {
    console.log('🎯 Day 15 - Testing Delivery Channels\n');
    
    const fetch = (await import('node-fetch')).default;
    
    // Test 1: Check channels
    console.log('1. Checking available channels...');
    const channels = await fetch('http://localhost:3333/api/channels');
    const data = await channels.json();
    console.log('   Available:', Object.keys(data));
    
    // Test 2: Send email (if configured)
    if (data.email?.active) {
        console.log('\n2. Testing email channel...');
        const result = await fetch('http://localhost:3333/api/send-message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                channel: 'email',
                recipient: { 
                    email: 'test@example.com',
                    subject: 'Test from ABBA'
                },
                message: 'This is a test message from Day 15'
            })
        });
        console.log('   Email test:', await result.json());
    }
    
    console.log('\n✅ Channel testing complete!');
}

testChannels().catch(console.error);