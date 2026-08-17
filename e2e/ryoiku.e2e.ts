import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
const require=createRequire(import.meta.url);const axeSource=readFileSync(require.resolve('axe-core/axe.min.js'),'utf8');

test('first run, travel flows, responsive layout, themes and accessibility',async({page},testInfo)=>{
  const externalRequests:string[]=[];page.on('request',request=>{const url=new URL(request.url());if(url.protocol.startsWith('http')&&url.origin!=='http://127.0.0.1:4173')externalRequests.push(request.url())});
  await page.addInitScript({content:axeSource});await page.goto('/');
  const setup=page.getByRole('heading',{name:'Create your administrator'});
  await expect(setup.or(page.getByRole('heading',{name:'Welcome back'}))).toBeVisible();
  if(await setup.isVisible()){await page.getByLabel('Display name').fill('E2E Traveler');await page.getByLabel('Username').fill('e2e-admin');await page.getByLabel('Password').fill('synthetic-e2e-password');await page.getByRole('button',{name:'Create account'}).click();}
  else{await page.getByLabel('Username').fill('e2e-admin');await page.getByLabel('Password').fill('synthetic-e2e-password');await page.getByRole('button',{name:'Sign in'}).click();}
  await expect(page.getByRole('heading',{name:'Your world'})).toBeVisible();await expect(page.getByRole('img',{name:'Visited places on an Equal Earth map'})).toBeVisible();
  const initialViolations=await page.evaluate(async()=>(await (window as unknown as {axe:{run:()=>Promise<{violations:unknown[]}>}}).axe.run()).violations);expect(initialViolations,JSON.stringify(initialViolations)).toEqual([]);
  const country={ 'desktop-chromium':'DE','desktop-firefox':'FR','mobile-webkit':'JP' }[testInfo.project.name]!;
  await page.getByRole('button',{name:'Add visit'}).click();let dialog=page.getByRole('dialog');await dialog.locator('select[name="countryCode"]').selectOption(country);await dialog.getByRole('button',{name:'Save'}).click();await expect(page.getByText('Visit added.')).toBeVisible();
  await page.getByRole('button',{name:'Cities',exact:true}).first().click();await page.getByRole('button',{name:'Add city'}).first().click();dialog=page.getByRole('dialog');await dialog.locator('select[name="countryCode"]').selectOption(country);await dialog.getByLabel('City name').fill(`E2E City ${testInfo.project.name}`);await dialog.getByRole('button',{name:'Save'}).click();await expect(page.getByText('City added.')).toBeVisible();
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);
  await page.getByRole('button',{name:'Open profile and settings'}).click();await expect(page.getByRole('heading',{name:'Settings'})).toBeVisible();const settingsViolations=await page.evaluate(async()=>(await (window as unknown as {axe:{run:()=>Promise<{violations:unknown[]}>}}).axe.run()).violations);expect(settingsViolations,JSON.stringify(settingsViolations)).toEqual([]);await page.getByRole('button',{name:'Close settings'}).click();
  if(testInfo.project.name==='desktop-chromium'){await page.getByRole('button',{name:'Map',exact:true}).first().click();await expect(page.getByRole('heading',{name:'Your world'})).toBeVisible();mkdirSync('test-results/visuals',{recursive:true});const viewports=[{name:'390x844',width:390,height:844},{name:'412x915',width:412,height:915},{name:'768x1024',width:768,height:1024},{name:'1440x900',width:1440,height:900},{name:'1920x1080',width:1920,height:1080}];for(const viewport of viewports)for(const theme of ['lavender','mint','sky','amber','rose','graphite'])for(const mode of ['light','dark']){await page.setViewportSize(viewport);await page.evaluate(({theme,mode})=>{document.documentElement.dataset.theme=theme;document.documentElement.dataset.mode=mode;document.documentElement.dataset.resolvedMode=mode},{theme,mode});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBe(true);await page.screenshot({path:`test-results/visuals/map-${viewport.name}-${theme}-${mode}.png`});}}
  expect(externalRequests,'Normal runtime must not contact third parties.').toEqual([]);
});
