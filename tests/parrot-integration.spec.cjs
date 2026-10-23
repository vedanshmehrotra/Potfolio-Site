const {test,expect}=require('@playwright/test');

test('Public studio loads the approved parrot without exposing QA controls',async({page})=>{
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/');await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
  await expect(page.locator('#app')).toHaveAttribute('data-parrot','ready');
  await expect(page.locator('#studio-parrot')).toBeVisible();
  expect(await page.evaluate(()=>window.studioParrot)).toBeUndefined();
  const before=await page.locator('#studio-parrot').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,96,96).data));
  await page.waitForTimeout(1350);
  const after=await page.locator('#studio-parrot').evaluate(c=>Array.from(c.getContext('2d').getImageData(0,0,96,96).data));
  expect(after).not.toEqual(before);expect(errors).toEqual([]);
});

test('A missing decorative parrot asset leaves studio navigation working',async({page})=>{
  await page.route('**/assets/parrot/parrot-atlas-v1.png',route=>route.abort());
  await page.goto('/');await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
  await expect(page.locator('#app')).toHaveAttribute('data-parrot','unavailable');
  await expect(page.locator('#studio-parrot')).toHaveCount(0);
  await page.locator('#monitor-hotspot').click();await expect(page.locator('#app')).toHaveAttribute('data-state','projects');
  await page.keyboard.press('Escape');await expect(page.locator('#app')).toHaveAttribute('data-state','room');
});
