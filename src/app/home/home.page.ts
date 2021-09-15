import { Component } from '@angular/core';
import { InAppBrowser, InAppBrowserEvent, InAppBrowserObject } from '@ionic-native/in-app-browser/ngx';
import { Platform } from '@ionic/angular';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  private browser: InAppBrowserObject;

  constructor(private iab: InAppBrowser, private platform: Platform) {
    platform.ready().then(() => {
      this.open('https://my.equifax.com/membercenter');
      //this.open('https://ionicframework.com');
    });
  }

  // This fixes any url links that break beforeload
  private fixLinks(): string {    
    return 'for (let link of document.getElementsByTagName("a")) {' +
           '   if (link.href.endsWith("/")) link.href = link.href.slice(0, -1);' +
           '};';
  }

  public open(url: string) {
    console.log('open ' + url);
    this.browser = this.iab.create(url, '_blank',
      {
        location: 'no',
        beforeload: 'get',
        zoom: 'no',
        suppressesIncrementalRendering: 'yes'
      });

    this.browser.on('loadstop').subscribe(async (event: InAppBrowserEvent) => {
      console.log(`loadstop ${JSON.stringify(event)}`);

      // This injects code on the page to wait for changes in the browser location and sends a message with the url to the application
      await this.browser.executeScript({
        code: 'setInterval(() => { if (window.lastHref != location.href) { '+this.fixLinks()+' var data = JSON.stringify({href: location.href}); window.lastHref = location.href; try { webkit.messageHandlers.cordova_iab.postMessage(data); } catch (err) { console.error(err); } } },100);'
      });
    });

    this.browser.on('loadstart').subscribe((event: InAppBrowserEvent) => {
      console.log(`loadstart ${JSON.stringify(event)}`);
    });

    this.browser.on('loaderror').subscribe((event: InAppBrowserEvent) => {
      console.log(`loaderror ${JSON.stringify(event)}`);
    });

    this.browser.on('beforeload').subscribe((event: InAppBrowserEvent) => {
      this.onBeforeLoad(event);
    });

    this.browser.on('message').subscribe((event: InAppBrowserEvent) => {
      // This will output the object in event.data. You could reference event.data.href
      console.log(`message`, JSON.stringify(event.data));
    });
  }

  private onBeforeLoad(event: InAppBrowserEvent) {
    console.log(`beforeload ${JSON.stringify(event)}`);

    if (event.url.toLowerCase().endsWith(".pdf")) {
      // We want to launch this in the system browser instead of from InAppBrowser
      console.error(`Opening ${event.url} in system browser`);
      window.open(event.url, '_system', 'location=yes');
      return;
    }

    // If the url isn't in the SPA application then open in the external browser
    if (!event.url.startsWith('https://my.')) {
      window.open(event.url, '_system', 'location=yes');
      console.error(`Opening ${event.url} in system browser`);
      return;
    }

    // Callback to ensure it loads
    console.log('_loadAfterBeforeLoad ' + event.url);
    this.browser._loadAfterBeforeload(event.url);
  }
}


/*

Notes:
This link does not get captured in before load
<a _ngcontent-jhj-c5="" id="online-privacy-policy" target="_blank" translate="" href="https://www.equifax.com/privacy/">Privacy Policy</a>

These links do
<a _ngcontent-jhj-c5="" id="ad-choices" target="_blank" translate="" href="https://www.equifax.com/ad-Choices">Ad Choices</a>
<a _ngcontent-jhj-c5="" id="lock-alert-terms-of-use" target="_blank" translate="" href="https://www.equifax.com/terms/myequifaxterms">Terms of Use</a>

Bug: If urls have a / at the end then beforeload does not fire. If they do not have a / then when they are reported by beforeload event a / is appended to the url

*/
