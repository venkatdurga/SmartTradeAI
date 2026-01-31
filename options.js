document.addEventListener('DOMContentLoaded', function () {
    const strategiesContainer = document.getElementById('strategies-container');
    const saveBtn = document.getElementById('save-settings');

    // Load strategies from storage and render them
    chrome.storage.local.get('strategies', function (data) {
        const strategies = data.strategies || {};

        for (const [key, strategy] of Object.entries(strategies)) {
            const strategyCard = document.createElement('div');
            strategyCard.className = 'strategy-card';

            let paramsHTML = '';
            for (const [param, value] of Object.entries(strategy.params)) {
                paramsHTML += `
          <div class="param-row">
            <label>${param}:</label>
            <input type="number" id="${key}-${param}" value="${value}" step="any">
          </div>
        `;
            }

            strategyCard.innerHTML = `
        <h3>${strategy.name}</h3>
        <p>${strategy.description}</p>
        ${paramsHTML}
      `;

            strategiesContainer.appendChild(strategyCard);
        }
    });

    // Save settings
    saveBtn.addEventListener('click', function () {
        chrome.storage.local.get('strategies', function (data) {
            const strategies = data.strategies || {};

            // Update params from inputs
            for (const [key, strategy] of Object.entries(strategies)) {
                for (const param of Object.keys(strategy.params)) {
                    const input = document.getElementById(`${key}-${param}`);
                    if (input) {
                        strategy.params[param] = parseFloat(input.value);
                    }
                }
            }

            // Save updated strategies
            chrome.storage.local.set({ strategies }, function () {
                alert('Settings saved successfully!');
            });
        });
    });
});