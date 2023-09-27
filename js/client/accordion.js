/*
* accordion.js
* Accordion script to restore functionality of the old adventurer's log accordion element.
*/

let currentIndex = -1;

const expandAccordion = (header) => {
  document.querySelectorAll('#RAAccordion .AMHead').forEach(h => {
    if (h.nextElementSibling.style.height !== '0px' && h !== header) {
      collapseAccordion(h);
    }
  });
  header.classList.add('selected');
  const body = header.nextElementSibling;
  body.style.height = '0';
  body.style.display = 'block';
  body.style.overflow = 'hidden';
  const targetHeight = '59px';
  body.style.transition = 'height 0.3s ease-out';
  setTimeout(() => { body.style.height = targetHeight; }, 0);
};

const collapseAccordion = (header) => {
  const body = header.nextElementSibling;
  header.classList.remove('selected');
  body.style.transition = 'height 0.3s ease-out';
  body.style.height = '0';
  setTimeout(() => { body.style.display = 'none'; }, 300);
};

document.addEventListener('click', (event) => {
  if (event.target.closest('#RAAccordion .AMHead')) {
    const RAAccordion = document.querySelector('#RAAccordion');
    const header = event.target.closest('.AMHead');
    const index = Array.from(RAAccordion.querySelectorAll('.AMHead')).indexOf(header);

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

function expandNewlyAddedElement(newHeader) {
  const allHeaders = document.querySelectorAll('.AMHead');
  allHeaders.forEach(header => {
    if (header !== newHeader) {
      collapseAccordion(header);
    }
  });

  expandAccordion(newHeader);
}