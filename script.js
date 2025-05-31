const numPlayers = 10;
const playerTable = document.getElementById('player-rows');
const ps = new BroadcastChannel('panel_status');
const pl = new BroadcastChannel('player_list');
const cl = new BroadcastChannel('class_list');
const gi = new BroadcastChannel('game_info');
let isFirstKill = true; // Флаг для отслеживания первого убийства

function createPlayerRows(num) {
    for (let i = 1; i <= num; i++) {
        const row = document.createElement('tr');
        row.className = 'player';
        row.id = `player_${i}`;
        row.innerHTML = `
            <td class="number"><p onclick="highlightSpeaker(${i})">${i}</p></td>
            <td class="players"><select class="player-list"></select></td>
            <td class="s-button killed-button col-status hide-status"><div onclick="changeStatus(this, 'killed')"></div></td>
            <td class="s-button voted-button col-status hide-status"><div onclick="changeStatus(this, 'voted')"></div></td>
            <td class="s-button deleted-button col-status hide-status"><div onclick="changeStatus(this, 'deleted')"></div></td>
            <td></td>
            <td class="s-button don-button col-role"><div onclick="changeRole(this, 'don')"></div></td>
            <td class="s-button mafia-button col-role"><div onclick="changeRole(this, 'mafia')"></div></td>
            <td class="s-button sheriff-button col-role"><div onclick="changeRole(this, 'sheriff')"></div></td>
        `;
        playerTable.appendChild(row);
    }
}

$(document).ready(function () {
    createPlayerRows(numPlayers);
    $('.main').hide();
    getPlayerList(player_list);
    const welcomeModal = document.getElementById('welcome-modal');
    if (welcomeModal) {
        welcomeModal.style.display = 'block';
        $('#fileToLoad').on('change', function () {
            welcomeModal.style.display = 'none';
            $('.main').show();
        });
    } else {
        $('#fileToLoad').on('change', function () {
            $('.main').show();
            hideStatusesShowRoles();
        });
    }
});

function loadFileAsText() {
    var fileToLoad = document.getElementById("fileToLoad").files[0];
    var fileReader = new FileReader();
    fileReader.onload = function (fileLoadedEvent) {
        var textFromFileLoaded = fileLoadedEvent.target.result;
        getPlayerList(textFromFileLoaded.split('\r\n'));
    };
    fileReader.readAsText(fileToLoad, "UTF-8");
    $('.main').show();
    $('header').hide();
    hideStatusesShowRoles();
}

function getPlayerList(playerArray) {
    document.querySelectorAll('.player-list').forEach((element, index) => {
        $(element).empty();
        playerArray.forEach(player => {
            element.add(new Option(player.trim()));
        });
        $(element).children('option').eq(index).attr('selected', 'selected');
    });
}

function changeStatus(object, status) {
    const element = object.parentElement.parentElement;
    if (element.classList.contains(status)) {
        element.classList.remove(status);
        element.classList.remove('dead');
    } else {
        if (element.classList.contains('dead')) {
            element.classList.remove('killed', 'voted', 'deleted');
        } else {
            element.classList.add('dead');
        }
        element.classList.add(status);
        if (status === 'killed' && isFirstKill) {
            isFirstKill = false;
            showBestMoveModal(element.id);
        }
    }
    cl.postMessage(`${element.id}|${element.classList.value}`);
}

function changeRole(object, role) {
    const element = object.parentElement.parentElement;
    if (element.classList.contains(role)) {
        element.classList.remove(role);
    } else {
        element.classList.remove('don', 'mafia', 'sheriff');
        element.classList.add(role);
    }
    cl.postMessage(`${element.id}|${element.classList.value}`);
}

function clearStatus() {
    document.querySelectorAll('.killed, .voted, .deleted, .dead').forEach(item => {
        item.classList.remove('killed', 'voted', 'deleted', 'dead');
    });
    document.querySelectorAll('.best-move').forEach(item => {
        item.remove();
    });
    document.querySelectorAll('.player').forEach(element => {
        cl.postMessage(`${element.id}|${element.classList.value}`);
    });
    isFirstKill = true;
    console.log("Статусы и ЛХ сброшены");
}

function clearRole() {
    document.querySelectorAll('.don, .mafia, .sheriff').forEach(item => {
        item.classList.remove('don', 'mafia', 'sheriff');
    });
    document.querySelectorAll('.player').forEach(element => {
        cl.postMessage(`${element.id}|${element.classList.value}`);
    });
}

$('#button-panel').click(function () {
    ps.postMessage(`body|${$('#button-panel').find('.checkbox')[0].checked ? 'visible' : ''}`);
});
$('.player-table').on('change', 'select', function () {
    const player = `${$(this).parents('.player')[0].id}|${$(this).find(":selected").val()}`;
    pl.postMessage(player);
});

function sendAllData() {
    document.querySelectorAll('.player').forEach(element => {
        const item = element.querySelector('.player-list');
        const player = `${element.id}|${$(item[item.selectedIndex]).text()}`;
        pl.postMessage(player);
    });
    console.log("Данные игроков отправлены.");
}

$('#game-number-input').on('input', function () {
    const gameNumber = $(this).val();
    gi.postMessage(gameNumber);
});

function highlightSpeaker(playerNumber) {
    ps.postMessage(`highlight|player_${playerNumber}`);
}

function showBestMoveModal(playerId) {
    const modal = document.getElementById('best-move-modal');
    modal.style.display = 'block';
    const closeBtn = modal.querySelector('.close');
    closeBtn.onclick = function () {
        modal.style.display = 'none';
        selectedNumbers = [];
        document.querySelectorAll('.number-button').forEach(button => button.classList.remove('selected-number'));
    };
    const saveBtn = modal.querySelector('#save-best-move');
    saveBtn.onclick = function () {
        if (selectedNumbers.length === 3) {
            const bestMove = selectedNumbers.join('');
            console.log("Отправка ЛХ:", `${playerId}|${document.getElementById(playerId).classList.value}|best-move|${bestMove}`);
            cl.postMessage(`${playerId}|${document.getElementById(playerId).classList.value}|best-move|${bestMove}`);
            modal.style.display = 'none';
            selectedNumbers = [];
            document.querySelectorAll('.number-button').forEach(button => button.classList.remove('selected-number'));
        } else {
            alert("Пожалуйста, выберите три цифры.");
        }
    };
}
let selectedNumbers = [];
function selectNumber(number) {
    const button = document.querySelector(`.number-button:nth-child(${number})`);
    if (!button.classList.contains('selected-number') && selectedNumbers.length < 3) {
        button.classList.add('selected-number');
        selectedNumbers.push(number);
    } else if (button.classList.contains('selected-number')) {
        button.classList.remove('selected-number');
        selectedNumbers = selectedNumbers.filter(n => n !== number);
    }
}

// --- Логика отображения статусов, ролей и кнопок ---

function hideStatusesShowRoles() {
    $('.main').removeClass('show-statuses-mode').addClass('show-roles-mode');
    $('.col-status').addClass('hide-status');
    $('.col-role').removeClass('hide-role').show();
    $('#show-players-btn').show();
}

function showStatusesHideRoles() {
    $('.main').removeClass('show-roles-mode').addClass('show-statuses-mode');
    $('.col-status').removeClass('hide-status');
    $('.col-role').addClass('hide-role').hide();
    $('#show-players-btn').hide();
}

function confirmRolesAndShowStatuses() {
    sendAllData();
    showStatusesHideRoles();
}

function editRoles() {
    hideStatusesShowRoles();
}

$(function () {
    // При загрузке страницы по-умолчанию режим "Роли"
    hideStatusesShowRoles();
});