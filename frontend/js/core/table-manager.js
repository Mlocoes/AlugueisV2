
class TableManager {
    constructor(tableBodyId) {
        this.tableBody = document.getElementById(tableBodyId);
    }

    render(data, renderRow, noDataMessage) {
        if (!this.tableBody) return;

        if (data.length === 0) {
            this.tableBody.innerHTML = noDataMessage;
            return;
        }

        const htmlContent = data.map(renderRow).join('');
        this.tableBody.innerHTML = htmlContent;
    }
}
