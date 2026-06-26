var editable = {
    ccell: null,
    cval: null,
    edit: cell => {
    editable.ccell = cell;
    editable.cval = cell.innerHTML;

    cell.classList.add("edit");
    cell.contentEditable = true;
    cell.focus();

    cell.onblur = editable.done;
    cell.onkeydown = e => {
        if (e.key == "Enter") { editable.done(); }
        if (e.key == "Escape") { editable.done(1); }
    };
    },

    done: discard => {
        editable.ccell.onblur = "";
        editable.ccell.onkeydown = "";

        editable.ccell.classList.remove("edit");
        editable.ccell.contentEditable = false;

        if (discard === 1) {
            editable.ccell.innerHTML = editable.cval;
        }
        if (editable.ccell.innerHTML != editable.cval) {
            console.log(editable.ccell.innerHTML);
        }
    }
};

window.addEventListener("load", () => {
    for (let td of document.querySelectorAll(".editable td")) {
        td.addEventListener("dblclick", () => editable.edit(td));
    }
});

window.toggleVisibility = (inputId, iconId) => {
    const input = document.getElementById(inputId);
    const icon = document.getElementById(iconId);
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.replace('bi-eye', 'bi-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.replace('bi-eye', 'bi-eye-slash'); 
        icon.classList.replace('bi-eye-slash', 'bi-eye');
    }
};

window.saveNode = async (btn, id) => {
    const row = btn.closest('tr');
    const cells = row.querySelectorAll('td');

    const isNew = id === 'new';
    console.log(isNew)
    const body = {
        name: cells[1].innerText,
        ip:   cells[2].innerText,
    };

    const res = await fetch(
        isNew ? `/environment/node` : `/environment/node/${id}`, 
        {
            method: isNew ? 'POST' : 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }
    );

    if (res.ok && isNew) {
        const created = await res.json();
        row.dataset.nodeId = created.id;
    }
};

window.deleteNode = async (id) => {
    await fetch(`/environment/node/${id}`, { method: 'DELETE' });
};

window.saveEnvironment = async () => {
const form = document.getElementById('envForm');
const id = form.dataset.envId;

const body = {
    name:               form.elements['name'].value,
    username:           form.elements['username'].value,
    token_name:         form.elements['token_name'].value,
    token_secret:       form.elements['token_secret'].value,
    template_folder_id: form.elements['template_folder'].value,
    container_storage:  form.elements['container_storage'].value,
    vm_storage:         form.elements['vm_storage'].value,
    machine_lan:        form.elements['machine_lan'].value,
};

const res = await fetch(`/environment/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
});

if (res.ok) {
    const btn = document.querySelector('[onclick="saveEnvironment()"]');
    btn.classList.replace('btn-primary', 'btn-success');
    btn.innerHTML = '<i class="bi bi-check-lg me-1"></i>Salvato!';
    setTimeout(() => {
        btn.classList.replace('btn-success', 'btn-primary');
        btn.innerHTML = '<i class="bi bi-floppy me-1"></i>Salva modifiche';
    }, 2000);
}
};

window.addNode = async () => {
    const tbody = document.querySelector('.editable tbody');
    const template = document.getElementById('nodeRowTemplate');
    const row = template.content.cloneNode(true);
    tbody.appendChild(row);
    tbody.querySelector('[data-node-id="new"] [contenteditable]').focus();
}