/*
* accordion.js
* Accordion script to restore functionality of the old adventurer's log accordion element.
*/

let currentIndex = -1;

const collapseAccordion = (header) => {
  const body = header.nextElementSibling;
  if (!body) return; // Check for null
  header.classList.remove('selected');
  body.style.transition = 'height 0.3s ease-out';
  body.style.height = '0';
  setTimeout(() => { body.style.display = 'none'; }, 300);
};

const expandAccordion = (header) => {
  if (!header || !header.nextElementSibling) return; // Check for null
  document.querySelectorAll('#RAAccordion .AMHead').forEach((h) => {
    if (h.nextElementSibling && h.nextElementSibling.style.height !== '0px' && h !== header) {
      collapseAccordion(h);
    }
  });
  header.classList.add('selected');
  const body = header.nextElementSibling;
  if (!body) return; // Check for null
  body.style.height = '0';
  body.style.display = 'block';
  body.style.overflow = 'hidden';
  const targetHeight = '59px';
  body.style.transition = 'height 0.3s ease-out';
  setTimeout(() => { body.style.height = targetHeight; }, 0);
};

document.addEventListener('click', (event) => {
  if (event.target.closest('#RAAccordion .AMHead')) {
    const RAAccordion = document.querySelector('#RAAccordion');
    const header = event.target.closest('.AMHead');
    const index = Array.from(RAAccordion.querySelectorAll('.AMHead')).indexOf(header);

    if (header.classList.contains('selected')) return;

    if (currentIndex !== index) {
      currentIndex = index;
      expandAccordion(header);
    } else {
      currentIndex = -1;
      collapseAccordion(header);
    }
  }

  if (event.target.closest('#RAAccordion .selected')) {
    const selected = event.target.closest('.selected');
    expandAccordion(selected.parentElement);
    currentIndex = 1;
  }
});

// Disabling because the definition of this function makes more sense here (and this is client code)
// eslint-disable-next-line no-unused-vars
function expandNewlyAddedElement(newHeader) {
  const allHeaders = document.querySelectorAll('.AMHead');
  allHeaders.forEach((header) => {
    if (header !== newHeader) {
      collapseAccordion(header);
    }
  });

  expandAccordion(newHeader);
}
