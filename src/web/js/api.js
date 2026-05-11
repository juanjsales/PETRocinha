const urlApp = "https://script.google.com/macros/s/AKfycbyCtBQ_wVDEpyKybzHgo9eFswc6tczQuFs53VLzg3t9HuoFbLOVVY_zrVScPxIwG2b0/exec";

export async function fetchUserData(cpf) {
    const response = await fetch(`${urlApp}?cpf=${cpf}`);
    return await response.json();
}

export async function fetchUserDataByEmail(email) {
    const response = await fetch(`${urlApp}?email=${encodeURIComponent(email.trim())}`);
    return await response.json();
}

export async function sendQuizLog(nome, cpf, email, isCorrect) {
    const url = `${urlApp}?action=logAcertoQuiz&nome=${encodeURIComponent(nome)}&cpf=${cpf}&email=${encodeURIComponent(email)}&status=${isCorrect ? 'acerto' : 'erro'}&pontos=${isCorrect ? 1 : 0}`;
    const response = await fetch(url);
    return await response.json();
}

export async function updateNotifStatus(cpf, novoStatus) {
    return await fetch(`${urlApp}?action=updateNotif&cpf=${cpf}&status=${novoStatus}`);
}
