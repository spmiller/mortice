import test from 'ava'

const mortice = require('../')

test('should forget references when asked', async(t) => {
    const name = "aLock";
    const originalMutex = mortice(name)

    t.true(originalMutex === mortice(name));

    await mortice.forget(name)

    t.true(originalMutex !== mortice(name));
})

test('should wait for other locks before forgetting', async(t) => {
    const name = "bLock";
    const firstMutex = mortice(name)

    const release = await firstMutex.readLock();

    let released = false;
    setTimeout(() => {released = true; release();}, 500);
    await mortice.forget(name);
    t.true(released);
})
