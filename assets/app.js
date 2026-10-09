"use strict";
const tabs = [...document.querySelectorAll('[role="tab"]')];
const cards = [...document.querySelectorAll('.card')];
const eras = [...document.querySelectorAll('.era')];
const search = document.querySelector('#search');
let active = 'all';
const searchable = new Map(cards.map(c => [c, c.textContent.toLocaleLowerCase()]));

function stopHiddenVideos() {
 document.querySelectorAll('.video-slot iframe').forEach(p => {
  if (p.closest('.card').hidden || !p.closest('details').open) {
   const slot=p.parentElement;p.remove();slot.querySelector('button').hidden=false;
  }
 });
}
document.querySelectorAll('details.photos').forEach(d => d.addEventListener('toggle',stopHiddenVideos));
function update() {
  const query = search.value.trim().toLocaleLowerCase();
  let count = 0;
  for (const card of cards) {
    card.hidden = !!query && !searchable.get(card).includes(query);
    if (!card.hidden) count++;
  }
  stopHiddenVideos();
  eras.forEach(era => era.hidden = ![...era.querySelectorAll('.card')].some(c => !c.hidden));
  document.querySelectorAll('.toc li').forEach(li => li.hidden = document.getElementById(li.dataset.target).hidden);
  document.querySelector('#result').textContent = `${count} / ${cards.length}개 주제`;
  document.querySelector('#empty').hidden = count !== 0;
  syncActiveEra();
}
function setActiveEra(era) {
  if (active === era && document.querySelector(`[data-era="${era}"][aria-selected="true"]`)) return;
  active = era;
  tabs.forEach(tab => {
    const selected = tab.dataset.era === era;
    tab.setAttribute('aria-selected', selected);
    tab.tabIndex = selected ? 0 : -1;
  });
  const current = tabs.find(tab => tab.dataset.era === era);
  if (current) {
    const menu = current.parentElement;
    const left = current.offsetLeft - menu.offsetLeft;
    if (left < menu.scrollLeft || left + current.offsetWidth > menu.scrollLeft + menu.clientWidth)
      menu.scrollTo({left: Math.max(0, left - (menu.clientWidth-current.offsetWidth)/2), behavior: 'smooth'});
  }
}
function syncActiveEra() {
  const threshold = document.querySelector('.toolbar').getBoundingClientRect().height + 40;
  let current = 'all';
  for (const era of eras) {
    if (!era.hidden && era.getBoundingClientRect().top <= threshold) current = era.id.slice(4);
  }
  setActiveEra(current);
}
let scrollPending = false;
window.addEventListener('scroll', () => {
  if (scrollPending) return;
  scrollPending = true;
  requestAnimationFrame(() => { scrollPending = false; syncActiveEra(); });
}, {passive:true});
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
function moveTo(target) {
  target.scrollIntoView({block:'start', behavior: reducedMotion.matches ? 'instant' : 'smooth'});
}

tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => {
    search.value = '';
    update();
    moveTo(document.querySelector(tab.dataset.era === 'all' ? '#top' : `#era-${tab.dataset.era}`));
  });
  tab.addEventListener('keydown', event => {
    const keys = {ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index - 1 + tabs.length) % tabs.length, Home: 0, End: tabs.length - 1};
    if (!(event.key in keys)) return;
    event.preventDefault();
    tabs[keys[event.key]].focus();
    tabs[keys[event.key]].click();
  });
});
search.addEventListener('input', () => { active = 'all'; update(); });
document.querySelector('#expand').addEventListener('click', () => document.querySelectorAll('.photos').forEach(d => d.open = true));
document.querySelector('#collapse').addEventListener('click', () => document.querySelectorAll('.photos').forEach(d => d.open = false));

function followHash() {
  let id;
  try { id = decodeURIComponent(location.hash.slice(1)); } catch { return; }
  const target = document.getElementById(id);
  if (!target) return;
  const card = target.closest('.card');
  if (card) { search.value = ''; update(); }
  else if (target.classList.contains('toc')) { search.value = ''; update(); }
  requestAnimationFrame(() => moveTo(target));
}
window.addEventListener('hashchange', followHash);
new ResizeObserver(entries => {
  document.documentElement.style.setProperty('--toolbar-height', `${entries[0].target.offsetHeight}px`);
  syncActiveEra();
}).observe(document.querySelector('.toolbar'));

document.querySelectorAll('.play-short').forEach(button => {
 button.addEventListener('click', () => {
  document.querySelectorAll('.video-slot iframe').forEach(p => {const slot=p.parentElement;p.remove();slot.querySelector('button').hidden=false;});
  const slot=button.closest('.video-slot'), player=document.createElement('iframe');
  player.src=`https://www.youtube-nocookie.com/embed/${slot.dataset.video}?autoplay=1&playsinline=1&rel=0`;
  player.title=button.getAttribute('aria-label');player.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';player.allowFullscreen=true;player.referrerPolicy='strict-origin-when-cross-origin';
  button.hidden=true;slot.append(player);
 });
});
let printState = [];
window.addEventListener('beforeprint', () => {
  printState = [...document.querySelectorAll('.photos')].map(d => d.open);
  document.querySelectorAll('.photos').forEach(d => d.open = true);
});
window.addEventListener('afterprint', () => document.querySelectorAll('.photos').forEach((d,i) => d.open = printState[i]));
document.querySelector('#print').addEventListener('click', () => window.print());
update();
followHash();
