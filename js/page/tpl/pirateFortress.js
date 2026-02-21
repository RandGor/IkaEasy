import Parent from './dummy.js';
import AntiCaptcha from '../../helper/anti-captcha.js';
var previousCaptcha = "";
var loadingCaptcha = false;

class Page extends Parent {
    

    async init() {
        const captchaImage = $('.captchaImage');
        const clientKey = this.options.get('anticaptcha_key', "");

        if (captchaImage.length > 0 && clientKey.length > 6) {
            let imageView = captchaImage[0]
            if (previousCaptcha == imageView.src) return;
            previousCaptcha = imageView.src;

            this.goSolveCaptcha(imageView, clientKey);

            // Create the refresh button
            const refreshBtn = document.createElement('button');
            refreshBtn.innerHTML = '↻';
            refreshBtn.style.marginLeft = '8px';
            refreshBtn.style.padding = '4px 8px';
            refreshBtn.style.cursor = 'pointer';
            refreshBtn.title = 'Refresh captcha';

            $('.captcha_input')[0].append(refreshBtn);

            refreshBtn.addEventListener('click', (event) => {
                event.preventDefault();
                this.goSolveCaptcha(imageView, clientKey);
            });
        }
    }

    goSolveCaptcha(imageView, clientKey) {        
        this.canvasExtract(imageView)
            .then((base64Image) => {
                if (loadingCaptcha) return;
                this.setSolving(true);
                AntiCaptcha.solveCaptcha(base64Image, clientKey)
                    .then((someResult) => {
                        console.log("solve captcha someResult", JSON.stringify(someResult));
                        $('#captcha').val(someResult);
                        this.setSolving(false);
                    })
                    .catch(error => {
                        console.log("solve captcha error!", error);
                        $('#captcha').val("");
                        this.setSolving(false);
                    });
            })
            .catch(error => {
                console.log("pirate captcha error!", error);
            });

    }

    setSolving(isSolving) {
        if(isSolving) {
            $('#captcha').val("loading...");
        }

        loadingCaptcha = isSolving;
    }

    canvasExtract(img) {
        return new Promise((resolve, reject) => {
            if (!img.complete) {
                img.onload = () => this.doCanvas(img, resolve, reject);
                img.onerror = reject;
            } else {
                this.doCanvas(img, resolve, reject);
            }
        });
    }

    doCanvas(img, resolve, reject) {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        try {
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/jpeg'));
        } catch (e) {
            reject(e);
        }
    }

}

export default Page;
