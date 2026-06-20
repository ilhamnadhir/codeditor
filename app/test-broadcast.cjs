const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://tpzpydmfybvfsgutvlbb.supabase.co', 'sb_publishable_M0nR4LkP6KnOBTKNxUtMww_lsjj8Zt9');

const channel1 = supabase.channel('test-room', { config: { broadcast: { ack: true } } });
const channel2 = supabase.channel('test-room', { config: { broadcast: { ack: true } } });

let c1Joined = false;
let c2Joined = false;

channel1.on('broadcast', { event: 'ping' }, (payload) => {
    console.log('C1 received:', payload);
});

channel2.on('broadcast', { event: 'ping' }, (payload) => {
    console.log('C2 received:', payload);
});

channel1.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
        c1Joined = true;
        checkReady();
    }
});

channel2.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
        c2Joined = true;
        checkReady();
    }
});

function checkReady() {
    if (c1Joined && c2Joined) {
        console.log('Both joined. Sending from C1...');
        channel1.send({
            type: 'broadcast',
            event: 'ping',
            payload: { message: 'hello from c1' }
        }).then(res => console.log('Send result:', res));
        
        setTimeout(() => process.exit(0), 3000);
    }
}
