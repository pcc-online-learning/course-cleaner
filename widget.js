const _cc = {
    version: "0.1",
    latest_css: "8.0",
    target_id: "app",
    app_container: null,
    table_cols: [
        {id: 'page', text: "Page + Module", note: ""},
        {id: 'update', text: "Up to Date?", note: ""},
        {id: 'stylesheets', text: "Linked Stylesheets", note: "(hover for full path)"},
        {id: 'warnings', text: "Manual Changes", note: ""}
    ],
    issues: {
        email: "carmi.troncibell@pcc.edu",
        docs: "https://github.com/pcc-online-learning/course-cleaner"
    }
}

window.addEventListener('DOMContentLoaded', (loadEvent) => {
    // build table for now
    _cc.app_container = document.getElementById(_cc.target_id);
    build(_cc.app_container);
    
    // fetch the stuff
})

function build (container) {
    // a rather verbose demonstration, perhaps a better scheme?
    const h1 = document.createElement('h1')
    h1.textContent = "IDS Course Cleaner"
    const dev_email = document.createElement('a')
    dev_email.setAttribute('href', `mailto:${_cc.issues.email}`)
    dev_email.innerText = "email the developer"
    const docs_link = document.createElement('a')
    docs_link.setAttribute('href', _cc.issues.docs)
    docs_link.innerText = "documentation"
    const content = document.createElement('p')
    content.innerHTML = `Version: ${_cc.version}
    <br><br>Latest CSS: <strong>${_cc.version}</strong>
    <br><br>Report issues and follow changes at the ${docs_link.outerHTML}
    <br><br>Or ${dev_email.outerHTML}`
    const table = document.createElement('table')
    const header = document.createElement('tr')
    table.appendChild(header)
    _cc.table_cols.forEach( item => {
        let col = document.createElement('th')
        let label = document.createElement('strong')
        label.innerText = item.text
        col.innerHTML = `${label.outerHTML} ${item.note}`
        col.setAttribute('scope', 'col')
        header.appendChild(col)
    })
    container.appendChild(h1);
    container.appendChild(content);
    container.appendChild(table);
}