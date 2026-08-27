class HttpClient {
    constructor(){
    }

    applyResponse(result) {
        const commands = typeof result === 'string' ? JSON.parse(result) : result;
        if (!Array.isArray(commands)) {
            throw new Error('Ikariam returned an invalid AJAX response');
        }
        if (!window.Front || typeof window.Front._parseObject !== 'function') {
            throw new Error('IkaEasy navigation is not ready to process the response');
        }

        // Internal requests and Navigation run in the same extension context.
        // Apply the response before resolving so callers never render a partially
        // updated set of cities while a queued postMessage is still pending.
        window.Front._parseObject(commands);
        return commands;
    }

    ikariam(path, params) {
        return new Promise((resolve, reject) => {
            params.actionRequest = Front.data.actionRequest;
            params.ajax = 1;

            let url = `${path}?${$.param(params)}`;

            $.ajax({
                url: url,
                async: true,
                dataType: "json",
                success: (result) => {
                    try {
                        this.applyResponse(result);
                        resolve(result);
                    } catch (error) {
                        reject(error);
                    }
                },
                error: (request, status, error) => {
                    reject(new Error(`Ikariam AJAX request failed (${status}): ${error || request.statusText || 'unknown error'}`));
                }
            });
        })
    }
}

export default new HttpClient();
