(() => {
    const launcher = document.getElementById('moving-chat-launcher');
    const panel = document.getElementById('moving-chat-panel');
    const input = document.getElementById('moving-chat-input');
    const messages = document.getElementById('moving-chat-messages');
    function setOpen(open) { panel.hidden = !open; launcher.setAttribute('aria-expanded', String(open)); (open ? input : launcher).focus(); }
    function message(text, customer = false, link) {
        const bubble = document.createElement('p'); bubble.className = 'moving-chat-message' + (customer ? ' customer' : ''); bubble.textContent = text;
        if (link) { const a = document.createElement('a'); a.href = link.href; a.textContent = link.label; if (link.href === '#estimate') a.addEventListener('click', () => setOpen(false)); bubble.appendChild(a); }
        messages.appendChild(bubble); messages.scrollTop = messages.scrollHeight;
    }
    const normalize = text => text.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    const stop = new Set(['a','an','the','do','does','you','your','i','my','we','is','are','can','what','how','of','for','in','to','and','with','me','about','please']);
    const tokens = text => normalize(text).split(' ').filter(w => w && !stop.has(w)).map(w => /^(costs?|prices?|pricing|rates?)$/.test(w) ? 'price' : /^(movers?|moving|moves?)$/.test(w) ? 'move' : w.replace(/s$/, ''));
    function answer(question) {
        const q = normalize(question);
        if (/\b(quote|estimate|book|booking|reserve|reservation|schedule a move)\b/.test(q)) return {text:'To request a quote or discuss booking, please complete our free quote form with your date, addresses, inventory and access details. Our team will confirm pricing and availability. Submitting the form does not confirm a booking.',link:{href:'#estimate',label:'Get Your Free Quote →'}};
        if (/^(hi|hello|hey|good morning|good afternoon)$/.test(q)) return {text:'Hello! I can help with moving services, pricing, packing and move preparation. What would you like to know?'};
        if (/\b(human|person|live agent|speak|talk|agent)\b/.test(q)) return {text:'I’m an automated moving assistant. For personal help, call Haul Bros at 571-899-1919 or send your question through our contact page.',link:{href:'contact/',label:'Contact our team →'}};
        if (/\b(price|pricing|rate|rates|cost|costs|charge)\b/.test(q) && !/\b(stair|elevator|deposit|cancel|packing|pack)\b/.test(q)) return {text:'Our published local crew-and-truck rates start at $395 for the first 2 hours with 2 movers, then $159 per additional hour; 3 movers start at $495, then $189/hour; 4 movers start at $695, then $249/hour. Your total depends on inventory, access, time and services. Confirm the details in your written estimate.',link:{href:'pricing/',label:'View moving rates →'}};
        const terms = tokens(q);
        const ranked = (window.haulBrosChatAnswers || []).map(item => {
            const heading = tokens(item.question); const body = tokens(item.answer);
            const matched = terms.filter(w => heading.includes(w));
            return {item,score:matched.length * 5 + terms.filter(w => body.includes(w)).length, coverage:matched.length / Math.max(terms.length,1)};
        }).sort((a,b)=>b.score-a.score);
        const best = ranked[0];
        if (best && best.score >= 5 && best.coverage >= .5) return {text:best.item.answer,link:{href:'faq/',label:'Explore our moving FAQs →'}};
        return {text:'I don’t have a confirmed answer to that specific question. Our team can help at 571-899-1919 or through the contact page. You can also browse our moving guides.',link:{href:'contact/',label:'Ask our team →'}};
    }
    function send(question) { if (!question.trim()) return; message(question, true); const response = answer(question); message(response.text, false, response.link); input.value = ''; }
    launcher.addEventListener('click', () => setOpen(panel.hidden));
    document.getElementById('moving-chat-close').addEventListener('click', () => setOpen(false));
    document.getElementById('moving-chat-form').addEventListener('submit', event => {event.preventDefault();send(input.value);});
    document.querySelectorAll('[data-chat-question]').forEach(button => button.addEventListener('click',()=>send(button.dataset.chatQuestion)));
    document.querySelectorAll('[data-chat-quote]').forEach(a=>a.addEventListener('click',()=>setOpen(false)));
    panel.addEventListener('keydown',event=>{if(event.key==='Escape')setOpen(false);});
    message('Hi! I’m the Haul Bros automated moving assistant. Ask about our services, pricing or moving preparation. For a quote or booking request, I’ll direct you to our free quote form.');
})();
