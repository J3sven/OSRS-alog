const modal = document.getElementById('modal');
document.getElementById('openModalBtn').addEventListener('click', (e) => {
  e.preventDefault();
  modal.style.display = 'flex';
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
});

document.getElementById('closeModalBtn').addEventListener('click', () => {
  modal.classList.remove('show');
  setTimeout(() => {
    modal.style.display = 'none';
  }, 300);
});

modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    modal.classList.remove('show');
    setTimeout(() => {
      modal.style.display = 'none';
    }, 300);
  }
});

document.getElementById('generateBtn').addEventListener('click', async () => {
  const response = await fetch('/generate-endpoint');
  const data = await response.json();
  const textField = document.getElementById('textField');

  const domain = window.location.origin;
  textField.value = `${domain}${data.endpoint}`;

  document.getElementById('generateBtn').classList.add('hidden');
  document.getElementById('copyBtn').classList.remove('hidden');
});

const tooltip = document.getElementById('tooltip');
document.getElementById('copyBtn').addEventListener('click', () => {
  const textField = document.getElementById('textField');
  textField.select();
  document.execCommand('copy');

  tooltip.classList.add('show');

  setTimeout(() => {
    tooltip.classList.remove('show');
  }, 2000);
});
