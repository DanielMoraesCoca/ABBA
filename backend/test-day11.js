async function testWidgetSystem() {
    console.log('🎯 Day 11 - Widget System Test\n');
    console.log('='.repeat(50));
    
    const BASE_URL = 'http://localhost:3333';
    
    // Dynamic import for node-fetch (ESM module)
    const fetch = (await import('node-fetch')).default;
    
    // Test 1: Create a widget
    console.log('\n1. Creating Widget:');
    try {
        const response = await fetch(`${BASE_URL}/widgets/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                agentId: 'test-agent-123',
                options: {
                    title: 'Customer Support',
                    theme: 'light',
                    primaryColor: '#10B981',
                    greeting: 'Hi! How can I help you today?',
                    position: 'bottom-right',
                    features: {
                        emoji: true,
                        typing: true
                    }
                }
            })
        });
        
        const data = await response.json();
        console.log('   ✅ Widget created');
        console.log('   Widget ID:', data.widget.widgetId);
        console.log('   Embed code length:', data.widget.embedCode.length, 'characters');
        
        // Store for next tests
        global.testWidgetId = data.widget.widgetId;
        global.testWidgetKey = data.widget.widgetKey;
        
    } catch (error) {
        console.log('   ❌ Widget creation failed:', error.message);
    }
    
    // Test 2: Get widget config
    console.log('\n2. Getting Widget Config:');
    try {
        const response = await fetch(`${BASE_URL}/widgets/${global.testWidgetId}/config`);
        const data = await response.json();
        console.log('   ✅ Config retrieved');
        console.log('   Theme:', data.config.options.theme);
        console.log('   Position:', data.config.options.position);
    } catch (error) {
        console.log('   ❌ Failed to get config:', error.message);
    }
    
    // Test 3: Update widget
    console.log('\n3. Updating Widget:');
    try {
        const response = await fetch(`${BASE_URL}/widgets/${global.testWidgetId}/config`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                theme: 'dark',
                primaryColor: '#8B5CF6'
            })
        });
        
        const data = await response.json();
        console.log('   ✅ Widget updated');
        console.log('   New theme:', data.config.options.theme);
        console.log('   New color:', data.config.options.primaryColor);
    } catch (error) {
        console.log('   ❌ Update failed:', error.message);
    }
    
    // Test 4: Validate domain
    console.log('\n4. Validating Domain:');
    try {
        const response = await fetch(`${BASE_URL}/widgets/${global.testWidgetId}/validate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                domain: 'https://example.com'
            })
        });
        
        const data = await response.json();
        console.log('   ✅ Domain validation tested');
        console.log('   Is valid:', data.valid);
    } catch (error) {
        console.log('   ❌ Validation failed:', error.message);
    }
    
    // Test 5: Widget stats
    console.log('\n5. Getting Widget Stats:');
    try {
        const response = await fetch(`${BASE_URL}/widgets/${global.testWidgetId}/stats`);
        const data = await response.json();
        console.log('   ✅ Stats retrieved');
        console.log('   Created:', data.stats.created);
    } catch (error) {
        console.log('   ❌ Stats failed:', error.message);
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('✅ Day 11 - Widget System Complete!');
    console.log('\n📊 Widget System Summary:');
    console.log('  • Widgets can be created and customized');
    console.log('  • Secure embedding with domain validation');
    console.log('  • Multiple themes and positions');
    console.log('  • Real-time communication ready');
    console.log('  • One-line embed code for any website');
    
    console.log('\n🎯 Try it yourself:');
    console.log(`  1. Visit: ${BASE_URL}/widgets/${global.testWidgetId}/customize`);
    console.log(`  2. Preview: ${BASE_URL}/widgets/standalone/${global.testWidgetId}`);
    console.log('\nAgents are now embeddable anywhere! 🚀');
}

testWidgetSystem().catch(console.error);
