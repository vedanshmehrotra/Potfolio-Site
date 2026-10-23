const {test,expect}=require('@playwright/test');
const fs=require('node:fs');
const ready=async page=>{
  await page.goto('/?qa=1&reference=1');
  await expect(page.locator('#app')).toHaveAttribute('data-ready','true');
};

test('Every room object has a compact pixel label and no native title tooltip',async({page},testInfo)=>{
  await ready(page);
  const labels={monitor:'Projects',about:'About me',journey:'Journey',resume:'Resume',contact:'Contact',bookshelf:'Certifications',lamp:'Turn on lamp'};
  for(const [id,label] of Object.entries(labels)) {
    const button=page.locator(`#${id}-hotspot`);
    await expect(button).not.toHaveAttribute('title');
    await button.hover();await expect(page.locator('#object-hint')).toHaveText(label);
    await expect(page.locator('#object-hint')).toBeVisible();
    expect(await page.locator('#object-hint').evaluate(el=>getComputedStyle(el).fontFamily)).toContain('StudioPixel');
    const bounds=await page.locator('#object-hint').boundingBox();
    expect(bounds.width).toBeLessThan(200);expect(bounds.height).toBeLessThan(40);
    expect(bounds.x).toBeGreaterThanOrEqual(8);expect(bounds.x+bounds.width).toBeLessThanOrEqual(1432);
    if(['resume','journey','contact'].includes(id))await page.screenshot({path:testInfo.outputPath(`${id}-hover.png`)});
  }
  await page.mouse.move(1400,850);await expect(page.locator('#object-hint')).toBeHidden();
  await page.locator('#resume-hotspot').focus();await expect(page.locator('#object-hint')).toHaveText('Resume');
  await expect(page.locator('#resume-outline polygon')).toHaveCSS('opacity','1');
  await page.keyboard.press('Escape');await expect(page.locator('#object-hint')).toBeHidden();
  await page.keyboard.press('Enter');await expect(page.locator('#app')).toHaveAttribute('data-state','resume');
  await expect(page.locator('#object-hint')).toBeHidden();
});

test('Angled hit areas exclude the board margin, journal gap and phone corners',async({page})=>{
  await ready(page);
  const hit=async(x,y)=>page.evaluate(({x,y})=>{
    const matrix=new DOMMatrix(getComputedStyle(document.querySelector('#world')).transform);
    return document.elementFromPoint(matrix.e+x*matrix.a,matrix.f+y*matrix.a)?.closest('.hotspot')?.id || null;
  },{x,y});
  expect(await hit(980,50)).toBeNull(); // Above the board's sloped top edge.
  expect(await hit(550,680)).toBeNull(); // Empty space between the journal and phone.
  expect(await hit(630,680)).toBeNull(); // Outside the angled phone, inside its old rectangle.
  expect(await hit(100,180)).toBeNull(); // Figurine beside the books.
  expect(await hit(800,180)).toBe('journey-hotspot');
  expect(await hit(405,712)).toBe('resume-hotspot');
  expect(await hit(600,706)).toBe('contact-hotspot');
  expect(await hit(200,180)).toBe('bookshelf-hotspot');
  for(const button of await page.locator('.hotspot').all()) {
    expect(await button.evaluate(el=>getComputedStyle(el).clipPath)).toMatch(/^polygon/);
    await button.hover();expect(await button.evaluate(el=>getComputedStyle(el).boxShadow)).toBe('none');
  }
});

test('The approved CV downloads from the journal without changing its file bytes',async({page})=>{
  await ready(page);await page.locator('#resume-hotspot').click();
  await expect(page.locator('#app')).toHaveAttribute('data-state','resume');
  const link=page.getByRole('link',{name:'DOWNLOAD PDF'});
  await expect(link).toHaveAttribute('href',/assets\/Vedansh-Mehrotra-CV\.pdf$/);
  const event=page.waitForEvent('download');await link.click();const file=await event;
  expect(file.suggestedFilename()).toBe('Vedansh-Mehrotra-CV.pdf');
  expect(fs.readFileSync(await file.path())).toEqual(fs.readFileSync('assets/Vedansh-Mehrotra-CV.pdf'));
});

test('Journey gives the board more room and keeps academic results inside chapter details',async({page})=>{
  await ready(page);await page.locator('#journey-hotspot').click();
  await expect(page.locator('#app')).toHaveAttribute('data-state','journey');
  const titles=await page.locator('.pin-title').allTextContents();
  expect(titles).toEqual(['School','University','First project','Internship','Milestone','Next role']);
  expect(titles.some(title=>/semester|class 10|class 12/i.test(title))).toBe(false);
  const board=await page.locator('.journey-board').boundingBox(),details=await page.locator('#milestone-detail').boundingBox();
  expect(board.width).toBeGreaterThan(1000);expect(details.x).toBeGreaterThan(board.x+board.width);
  await page.getByRole('button',{name:'School PREVIEW',exact:true}).click();
  await expect(page.locator('#milestone-detail')).toContainText('Class 10 or 12 results');
});
