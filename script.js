(function(){

  const state = {
    coverImg:'', title:'', desc:'',
    coverEmptyMode:'title',
    visibleCount:3,
    songs:[],
    colors:{ bg:'#ffffff', text:'#666666', sub:'#bac0c6', accent:'#b8d0e6' }
  };
  const DEFAULT_COLORS = Object.assign({}, state.colors);
  const STORAGE_KEY = 'playlist_builder_state_v1';
  let idCounter = 0;
  function uid(){ idCounter += 1; return 's'+idCounter; }

  function newSong(prefill){
    return Object.assign({ id: uid(), url:'', cover:'', title:'', artist:'', duration:'', status:'', statusMsg:'' }, prefill||{});
  }

  function escapeHtml(str){
    return (str||'').replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; });
  }

  function extractYoutubeId(url){
    if(!url) return null;
    const patterns = [
      /youtu\.be\/([a-zA-Z0-9_-]{6,})/,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{6,})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{6,})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{6,})/
    ];
    for(let i=0;i<patterns.length;i++){
      const m = url.match(patterns[i]);
      if(m) return m[1];
    }
    return null;
  }

  const els = {
    cover: document.getElementById('playlistCover'),
    coverFile: document.getElementById('playlistCoverFile'),
    title: document.getElementById('playlistTitle'),
    desc: document.getElementById('playlistDesc'),
    visibleCount: document.getElementById('visibleCount'),
    songList: document.getElementById('songList'),
    addSongBtn: document.getElementById('addSongBtn'),
    sampleBtn: document.getElementById('sampleBtn'),
    resetAllBtn: document.getElementById('resetAllBtn'),
    saveStatus: document.getElementById('saveStatus'),
    previewFrame: document.getElementById('previewFrame'),
    outputCode: document.getElementById('outputCode'),
    copyBtn: document.getElementById('copyBtn'),
    songCountPill: document.getElementById('songCountPill'),
    colorBg: document.getElementById('colorBg'), colorText: document.getElementById('colorText'),
    colorSub: document.getElementById('colorSub'), colorAccent: document.getElementById('colorAccent'),
    hexBg: document.getElementById('hexBg'), hexText: document.getElementById('hexText'),
    hexSub: document.getElementById('hexSub'), hexAccent: document.getElementById('hexAccent'),
    resetColorsBtn: document.getElementById('resetColorsBtn')
  };

  function updateSaveStatus(text){ els.saveStatus.textContent = text; }

  let saveTimer = null;
  function scheduleSave(){
    if(saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveState, 700);
  }

  function saveState(){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      updateSaveStatus('자동 저장됨 · ' + new Date().toLocaleTimeString());
    }catch(e){
      updateSaveStatus('이 브라우저에서는 자동 저장을 사용할 수 없어요');
    }
  }

  // 동기적으로 즉시 불러온다 (비동기 로딩 중 사용자가 입력한 값이 나중에 덮어써지는 경쟁 상태를 방지)
  function loadState(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return false;
      const restored = JSON.parse(raw);
      Object.assign(state, restored);
      state.colors = Object.assign({}, DEFAULT_COLORS, state.colors||{});
      state.songs = state.songs || [];
      state.coverEmptyMode = state.coverEmptyMode || 'title';
      let maxId = 0;
      state.songs.forEach(function(s){
        const m = /^s(\d+)$/.exec(s.id||'');
        if(m) maxId = Math.max(maxId, parseInt(m[1],10));
      });
      idCounter = maxId;
      return true;
    }catch(e){
      return false;
    }
  }

  function syncFormFromState(){
    els.cover.value = state.coverImg;
    els.title.value = state.title;
    els.desc.value = state.desc;
    els.visibleCount.value = state.visibleCount;
    els.colorBg.value = state.colors.bg; els.hexBg.textContent = state.colors.bg;
    els.colorText.value = state.colors.text; els.hexText.textContent = state.colors.text;
    els.colorSub.value = state.colors.sub; els.hexSub.textContent = state.colors.sub;
    els.colorAccent.value = state.colors.accent; els.hexAccent.textContent = state.colors.accent;
    const radio = document.querySelector('input[name="coverEmptyMode"][value="'+state.coverEmptyMode+'"]');
    if(radio) radio.checked = true;
  }

  els.cover.addEventListener('input', function(){ state.coverImg = this.value; renderAll(); });
  els.title.addEventListener('input', function(){ state.title = this.value; renderAll(); });
  els.desc.addEventListener('input', function(){ state.desc = this.value; renderAll(); });
  els.visibleCount.addEventListener('input', function(){
    state.visibleCount = Math.max(1, parseInt(this.value||'1',10));
    renderAll();
  });
  els.coverFile.addEventListener('change', function(e){
    const f = e.target.files[0];
    if(!f) return;
    const reader = new FileReader();
    reader.onload = function(ev){ state.coverImg = ev.target.result; els.cover.value = state.coverImg; renderAll(); };
    reader.readAsDataURL(f);
  });
  document.querySelectorAll('input[name="coverEmptyMode"]').forEach(function(r){
    r.addEventListener('change', function(){ if(this.checked){ state.coverEmptyMode = this.value; renderAll(); } });
  });

  function bindColorInput(input, hexLabel, key){
    input.addEventListener('input', function(){ state.colors[key] = this.value; hexLabel.textContent = this.value; renderAll(); });
  }
  bindColorInput(els.colorBg, els.hexBg, 'bg');
  bindColorInput(els.colorText, els.hexText, 'text');
  bindColorInput(els.colorSub, els.hexSub, 'sub');
  bindColorInput(els.colorAccent, els.hexAccent, 'accent');

  els.resetColorsBtn.addEventListener('click', function(){
    state.colors = Object.assign({}, DEFAULT_COLORS);
    syncFormFromState();
    renderAll();
  });

  els.resetAllBtn.addEventListener('click', function(){
    if(!confirm('입력한 모든 내용(커버, 제목, 설명, 곡 목록, 색상)을 삭제할까요? 되돌릴 수 없어요.')) return;
    state.coverImg = ''; state.title = ''; state.desc = ''; state.visibleCount = 5;
    state.songs = []; state.coverEmptyMode = 'title';
    state.colors = Object.assign({}, DEFAULT_COLORS);
    syncFormFromState();
    renderBuilderSongs();
    renderAll();
    try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
    updateSaveStatus('초기화됨');
  });

  els.addSongBtn.addEventListener('click', function(){
    state.songs.push(newSong());
    renderBuilderSongs();
    renderAll();
  });

  els.copyBtn.addEventListener('click', function(){
    els.outputCode.select();
    els.outputCode.setSelectionRange(0, 999999);
    navigator.clipboard.writeText(els.outputCode.value).then(function(){
      const orig = els.copyBtn.textContent;
      els.copyBtn.textContent = '복사됨!';
      setTimeout(function(){ els.copyBtn.textContent = orig; }, 1400);
    }).catch(function(){ document.execCommand('copy'); });
  });

  function renderBuilderSongs(){
    els.songList.innerHTML = state.songs.map(function(song, idx){
      const statusHtml = song.status === 'ok'
        ? '<div class="yt-status ok">불러왔습니다. 필요하면 아래 값을 수정하세요.</div>'
        : song.status === 'err'
        ? '<div class="yt-status err">'+escapeHtml(song.statusMsg||'자동으로 가져오지 못했습니다. 직접 입력해주세요.')+'</div>'
        : song.status === 'loading'
        ? '<div class="yt-status">불러오는 중...</div>'
        : '<div class="yt-status"></div>';

      return (
        '<div class="song-card" data-id="'+song.id+'">'+
          '<div class="song-head"><span class="idx">SONG '+String(idx+1).padStart(2,'0')+'</span><button class="btn danger small" data-action="remove">삭제</button></div>'+
          '<label class="field"><span class="lbl">유튜브 링크</span>'+
            '<div class="row-inline"><input type="text" data-field="url" value="'+escapeHtml(song.url)+'" placeholder="https://www.youtube.com/watch?v=..."><button class="btn small" data-action="fetch">정보 가져오기</button></div>'+
            statusHtml+
          '</label>'+
          '<label class="field"><span class="lbl">앨범 커버 이미지</span>'+
            '<div class="upload-row">'+
              (song.cover ? '<img class="thumb-preview" src="'+escapeHtml(song.cover)+'">' : '')+
              '<input type="text" data-field="cover" value="'+escapeHtml(song.cover)+'" placeholder="이미지 URL (자동으로 채워짐)">'+
              '<button class="btn file-btn small">파일 선택<input type="file" accept="image/*" data-field="coverFile"></button>'+
            '</div>'+
          '</label>'+
          '<div class="two-col">'+
            '<label class="field"><span class="lbl">곡 제목</span><input type="text" data-field="title" value="'+escapeHtml(song.title)+'" placeholder="곡 제목"></label>'+
            '<label class="field"><span class="lbl">가수</span><input type="text" data-field="artist" value="'+escapeHtml(song.artist)+'" placeholder="가수"></label>'+
          '</div>'+
          '<label class="field" style="max-width:140px;"><span class="lbl">길이</span><input type="text" data-field="duration" value="'+escapeHtml(song.duration)+'" placeholder="예: 3:45"></label>'+
        '</div>'
      );
    }).join('') || '<p class="helper">아직 추가된 곡이 없어요. 아래 버튼으로 곡을 추가해보세요.</p>';

    Array.from(els.songList.querySelectorAll('.song-card')).forEach(function(card){
      const id = card.getAttribute('data-id');
      card.querySelectorAll('input[data-field]').forEach(function(input){
        if(input.type === 'file') return;
        input.addEventListener('input', function(){ updateSong(id, input.getAttribute('data-field'), input.value); });
      });
      const fileInput = card.querySelector('input[data-field="coverFile"]');
      if(fileInput){
        fileInput.addEventListener('change', function(e){
          const f = e.target.files[0];
          if(!f) return;
          const reader = new FileReader();
          reader.onload = function(ev){ updateSong(id, 'cover', ev.target.result); renderBuilderSongs(); };
          reader.readAsDataURL(f);
        });
      }
      card.querySelector('[data-action="remove"]').addEventListener('click', function(){
        state.songs = state.songs.filter(function(s){ return s.id !== id; });
        renderBuilderSongs(); renderAll();
      });
      card.querySelector('[data-action="fetch"]').addEventListener('click', function(){ fetchYoutubeData(id); });
    });
  }

  function updateSong(id, field, value){
    const song = state.songs.find(function(s){ return s.id === id; });
    if(!song) return;
    song[field] = value;
    renderAll();
  }

  function fetchYoutubeData(id){
    const song = state.songs.find(function(s){ return s.id === id; });
    if(!song) return;
    if(!song.url){
      song.status = 'err'; song.statusMsg = '먼저 유튜브 링크를 입력해주세요.';
      renderBuilderSongs(); return;
    }
    song.status = 'loading';
    renderBuilderSongs();
    const oembedUrl = 'https://www.youtube.com/oembed?format=json&url=' + encodeURIComponent(song.url);
    fetch(oembedUrl)
      .then(function(res){ if(!res.ok) throw new Error('not ok'); return res.json(); })
      .then(function(data){
        song.title = data.title || song.title;
        song.artist = data.author_name || song.artist;
        song.cover = data.thumbnail_url || song.cover;
        song.status = 'ok';
        renderBuilderSongs(); renderAll();
      })
      .catch(function(){
        song.status = 'err';
        song.statusMsg = '브라우저 환경 때문에 자동으로 가져오지 못했어요. 제목·가수·이미지를 직접 입력해주세요.';
        renderBuilderSongs();
      });
  }

  const PRETENDARD_FONT_FACE =
"@font-face{font-family:'Pretendard';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Thin.woff2') format('woff2');font-weight:100;font-display:swap;}\n"+
"@font-face{font-family:'Pretendard';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-ExtraLight.woff2') format('woff2');font-weight:200;font-display:swap;}\n"+
"@font-face{font-family:'Pretendard';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Light.woff2') format('woff2');font-weight:300;font-display:swap;}\n"+
"@font-face{font-family:'Pretendard';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Regular.woff2') format('woff2');font-weight:400;font-display:swap;}\n"+
"@font-face{font-family:'Pretendard';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Medium.woff2') format('woff2');font-weight:500;font-display:swap;}\n"+
"@font-face{font-family:'Pretendard';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-SemiBold.woff2') format('woff2');font-weight:600;font-display:swap;}\n"+
"@font-face{font-family:'Pretendard';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Bold.woff2') format('woff2');font-weight:700;font-display:swap;}\n"+
"@font-face{font-family:'Pretendard';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-ExtraBold.woff2') format('woff2');font-weight:800;font-display:swap;}\n"+
"@font-face{font-family:'Pretendard';src:url('https://cdn.jsdelivr.net/gh/projectnoonnu/pretendard@1.0/Pretendard-Black.woff2') format('woff2');font-weight:900;font-display:swap;}";

  function buildWidgetHtml(){
    const p = 'pl' + Math.random().toString(36).slice(2,8);
    const cover = state.coverImg || '';
    const title = state.title || '플레이리스트 제목';
    const desc = state.desc || '';
    const visible = Math.max(1, state.visibleCount || 5);
    const c = state.colors;

    const enriched = state.songs.map(function(song){ return { song: song, vid: extractYoutubeId(song.url) }; });
    const mainItems = enriched.slice(0, visible);
    const extraItems = enriched.slice(visible);
    const playable = enriched.filter(function(it){ return !!it.vid; });

    function rowHtml(item){
      const song = item.song, vid = item.vid;
      const t = escapeHtml(song.title || '곡 제목');
      const a = escapeHtml(song.artist || '가수');
      const d = escapeHtml(song.duration || '');
      const meta = d ? (a + ' · ' + d) : a;
      const thumb = song.cover
        ? '<span class="'+p+'-thumb"><img src="'+escapeHtml(song.cover)+'" alt=""></span>'
        : '<span class="'+p+'-thumb '+p+'-thumb-ph">앨범<br>커버</span>';
      const playIcons =
        '<span class="'+p+'-play">'+
          '<svg class="'+p+'-icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 21,12 5,21"/></svg>'+
          '<svg class="'+p+'-icon-pause" viewBox="0 0 24 24" fill="currentColor"><rect x="5" y="3" width="5" height="18"/><rect x="14" y="3" width="5" height="18"/></svg>'+
        '</span>';
      const info = '<span class="'+p+'-info"><span class="'+p+'-name">'+t+'</span><span class="'+p+'-meta">'+meta+'</span></span>';

      if(vid){
        return '<label class="'+p+'-row" for="'+p+'-r-'+song.id+'" data-idx="'+song.id+'">'+thumb+info+playIcons+'</label>';
      } else if(song.url){
        return '<a class="'+p+'-row" href="'+escapeHtml(song.url)+'" target="_blank" rel="noopener noreferrer" data-idx="'+song.id+'">'+thumb+info+playIcons+'</a>';
      } else {
        return '<div class="'+p+'-row '+p+'-row-static" data-idx="'+song.id+'">'+thumb+info+'<span class="'+p+'-play '+p+'-play-disabled"><svg class="'+p+'-icon-play" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 21,12 5,21"/></svg></span></div>';
      }
    }

    const mainRows = mainItems.map(rowHtml).join('\n      ');
    const extraRows = extraItems.map(rowHtml).join('\n      ');
    const extraCount = extraItems.length;

    const radios = '<input type="radio" name="'+p+'-player" id="'+p+'-r-none" class="'+p+'-radio" checked>' +
      playable.map(function(it){ return '<input type="radio" name="'+p+'-player" id="'+p+'-r-'+it.song.id+'" class="'+p+'-radio" data-idx="'+it.song.id+'">'; }).join('');

    let coverBlock;
    if(cover){
      coverBlock = '<div class="'+p+'-cover-wrap"><div class="'+p+'-cover"><img src="'+escapeHtml(cover)+'" alt="'+escapeHtml(title)+'"></div></div>';
    } else if(state.coverEmptyMode === 'hide'){
      coverBlock = '';
    } else {
      coverBlock = '<div class="'+p+'-cover-wrap"><div class="'+p+'-cover"><span class="ph-text">'+escapeHtml(title)+'</span></div></div>';
    }

    const nowPlaying = playable.length
      ? '<div class="'+p+'-now-playing">\n'+
        '    <div class="'+p+'-np-close-row"><label class="'+p+'-np-close" for="'+p+'-r-none">← 목록으로</label></div>\n'+
        playable.map(function(it){
          return '    <div class="'+p+'-np-item" data-idx="'+it.song.id+'"><div class="'+p+'-np-frame"><iframe src="https://www.youtube.com/embed/'+it.vid+'?enablejsapi=1&playsinline=1&rel=0" title="'+escapeHtml(it.song.title||'')+'" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe></div></div>';
        }).join('\n')+
        '\n  </div>'
      : '';

    let moreToggle = '', extraBlock = '', moreBtn = '';
    if(extraCount > 0){
      moreToggle = '<input type="checkbox" id="'+p+'-more" class="'+p+'-more-toggle">';
      extraBlock = '<div class="'+p+'-list '+p+'-extra-list">\n      '+extraRows+'\n    </div>';
      moreBtn = '<label for="'+p+'-more" class="'+p+'-more-btn"><span class="'+p+'-more-text">더보기 ('+extraCount+'곡)</span><span class="'+p+'-close-text">닫기</span></label>';
    }

    const perSongCss = playable.map(function(it){
      const id = it.song.id;
      return (
'.'+p+' #'+p+'-r-'+id+':checked ~ .'+p+'-header { display:none !important; }\n'+
'.'+p+' #'+p+'-r-'+id+':checked ~ .'+p+'-now-playing .'+p+'-np-close-row { display:flex !important; }\n'+
'.'+p+' #'+p+'-r-'+id+':checked ~ .'+p+'-now-playing [data-idx="'+id+'"] { display:block !important; }\n'+
'.'+p+' #'+p+'-r-'+id+':checked ~ .'+p+'-list [data-idx="'+id+'"],\n'+
'.'+p+' #'+p+'-r-'+id+':checked ~ .'+p+'-extra-list [data-idx="'+id+'"] { background:var(--'+p+'-hover) !important; }\n'+
'.'+p+' #'+p+'-r-'+id+':checked ~ .'+p+'-list [data-idx="'+id+'"] .'+p+'-icon-play,\n'+
'.'+p+' #'+p+'-r-'+id+':checked ~ .'+p+'-extra-list [data-idx="'+id+'"] .'+p+'-icon-play { display:none !important; }\n'+
'.'+p+' #'+p+'-r-'+id+':checked ~ .'+p+'-list [data-idx="'+id+'"] .'+p+'-icon-pause,\n'+
'.'+p+' #'+p+'-r-'+id+':checked ~ .'+p+'-extra-list [data-idx="'+id+'"] .'+p+'-icon-pause { display:inline-flex !important; }'
      );
    }).join('\n');

    const style =
'<style>\n'+
PRETENDARD_FONT_FACE+'\n'+
'.'+p+' { --'+p+'-bg:'+c.bg+'; --'+p+'-text:'+c.text+'; --'+p+'-sub:'+c.sub+'; --'+p+'-accent:'+c.accent+'; --'+p+'-hover:'+c.accent+'19; --'+p+'-border:'+c.accent+'55; --'+p+'-subbg:'+c.sub+'22; --'+p+'-subborder:'+c.sub+'40; }\n'+
'.'+p+' { max-width:350px; margin:0 auto; font-family:"Pretendard",-apple-system,BlinkMacSystemFont,"Malgun Gothic","Apple SD Gothic Neo",sans-serif; color:var(--'+p+'-text); background:var(--'+p+'-bg); padding:20px; border-radius:16px; box-sizing:border-box; }\n'+
'.'+p+' *{box-sizing:border-box;}\n'+
'.'+p+' .'+p+'-header { display:flex !important; flex-direction:column !important; align-items:center !important; text-align:center !important; margin-bottom:36px; }\n'+
'.'+p+' .'+p+'-cover-wrap { width:50%; margin:0 auto 16px; }\n'+
'.'+p+' .'+p+'-cover { width:100%; aspect-ratio:1/1; border-radius:14px; overflow:hidden; background:var(--'+p+'-subbg); border:1px solid var(--'+p+'-subborder); display:flex; align-items:center; justify-content:center; }\n'+
'.'+p+' .'+p+'-cover img { width:100%; height:100%; object-fit:cover; display:block; }\n'+
'.'+p+' .'+p+'-cover .ph-text { color:var(--'+p+'-sub); font-size:12px; text-align:center; padding:0 10px; }\n'+
'.'+p+' .'+p+'-title { font-size:18px; font-weight:700; margin:0 0 4px; }\n'+
'.'+p+' .'+p+'-desc { font-size:13px; color:var(--'+p+'-sub); margin:0; }\n'+
'.'+p+' .'+p+'-now-playing { display:contents; }\n'+
'.'+p+' .'+p+'-np-close-row { display:none; margin-bottom:10px; }\n'+
'.'+p+' .'+p+'-np-close { font-size:12px; color:var(--'+p+'-sub); cursor:pointer; }\n'+
'.'+p+' .'+p+'-np-close:hover { color:var(--'+p+'-accent); }\n'+
'.'+p+' .'+p+'-np-item { display:none; margin-bottom:28px; }\n'+
'.'+p+' .'+p+'-np-frame { position:relative; width:100%; padding-top:56.25%; border-radius:14px; overflow:hidden; background:#000; }\n'+
'.'+p+' .'+p+'-np-frame iframe { position:absolute; inset:0; width:100%; height:100%; border:0; }\n'+
'.'+p+' .'+p+'-list { display:flex !important; flex-direction:column !important; gap:8px !important; }\n'+
'.'+p+' .'+p+'-list.'+p+'-extra-list { display:none !important; margin-top:8px; }\n'+
'.'+p+' .'+p+'-more-toggle:checked ~ .'+p+'-list.'+p+'-extra-list { display:flex !important; flex-direction:column !important; gap:8px !important; }\n'+
'.'+p+' .'+p+'-row { display:flex !important; flex-direction:row !important; align-items:center !important; gap:15px !important; padding:10px !important; border-radius:12px !important; text-decoration:none !important; color:inherit !important; border:1px solid var(--'+p+'-border) !important; cursor:pointer; }\n'+
'.'+p+' .'+p+'-row:hover { background:var(--'+p+'-hover) !important; }\n'+
'.'+p+' .'+p+'-row-static { cursor:default; }\n'+
'.'+p+' .'+p+'-thumb { width:48px !important; height:48px !important; flex-shrink:0 !important; border-radius:8px; overflow:hidden; display:flex; align-items:center; justify-content:center; background:var(--'+p+'-subbg); }\n'+
'.'+p+' .'+p+'-thumb img { width:100%; height:100%; object-fit:cover; display:block; }\n'+
'.'+p+' .'+p+'-thumb-ph { font-size:9px; color:var(--'+p+'-sub); text-align:center; line-height:1.2; }\n'+
'.'+p+' .'+p+'-info { flex:1 1 auto !important; min-width:0 !important; display:flex !important; flex-direction:column !important; }\n'+
'.'+p+' .'+p+'-name { font-size:14px; font-weight:600; margin:0 0 2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n'+
'.'+p+' .'+p+'-meta { font-size:12px; color:var(--'+p+'-sub); margin:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }\n'+
'.'+p+' .'+p+'-play { width:30px !important; height:30px !important; flex-shrink:0 !important; border-radius:50% !important; border:1px solid var(--'+p+'-border) !important; display:flex !important; align-items:center !important; justify-content:center !important; color:var(--'+p+'-accent); }\n'+
'.'+p+' .'+p+'-play svg { width:11px; height:11px; }\n'+
'.'+p+' .'+p+'-icon-pause { display:none; }\n'+
'.'+p+' .'+p+'-play-disabled { opacity:.35; }\n'+
'.'+p+' .'+p+'-row.is-paused .'+p+'-icon-pause { display:none !important; }\n'+
'.'+p+' .'+p+'-row.is-paused .'+p+'-icon-play { display:inline-flex !important; }\n'+
'.'+p+' .'+p+'-radio, .'+p+' .'+p+'-more-toggle { position:absolute; width:0; height:0; margin:0; padding:0; opacity:0; pointer-events:none; }\n'+
'.'+p+' .'+p+'-more-btn { display:flex !important; align-items:center !important; justify-content:center !important; margin-top:8px; padding:10px 8px; font-size:13px; color:var(--'+p+'-sub); border:1px dashed var(--'+p+'-border); border-radius:12px; cursor:pointer; }\n'+
'.'+p+' .'+p+'-more-btn:hover { color:var(--'+p+'-accent); border-style:solid; }\n'+
'.'+p+' .'+p+'-more-btn .'+p+'-close-text { display:none; }\n'+
'.'+p+' .'+p+'-more-toggle:checked ~ .'+p+'-more-btn .'+p+'-more-text { display:none; }\n'+
'.'+p+' .'+p+'-more-toggle:checked ~ .'+p+'-more-btn .'+p+'-close-text { display:inline; }\n'+
perSongCss+'\n'+
'</style>';

    const orderArr = JSON.stringify(playable.map(function(it){ return it.song.id; }));

    const script = playable.length ?
'<script>\n'+
'(function(){\n'+
'  var root = document.currentScript.parentElement;\n'+
'  var order = '+orderArr+';\n'+
'  var frames = {}, players = {}, radiosByIdx = {};\n'+
'  root.querySelectorAll(\'input[type="radio"]\').forEach(function(r){\n'+
'    var idx = r.getAttribute("data-idx");\n'+
'    if(idx) radiosByIdx[idx] = r;\n'+
'  });\n'+
'  var noneRadio = root.querySelector(\'input[type="radio"]:not([data-idx])\');\n'+
'  root.querySelectorAll("[data-idx]").forEach(function(el){\n'+
'    var f = el.querySelector("iframe");\n'+
'    if(f) frames[el.getAttribute("data-idx")] = f;\n'+
'  });\n'+
'  function selectSong(idx){\n'+
'    var r = idx ? radiosByIdx[idx] : noneRadio;\n'+
'    if(r && !r.checked){ r.checked = true; r.dispatchEvent(new Event("change", {bubbles:true})); }\n'+
'  }\n'+
'  function nextIdx(idx){\n'+
'    var i = order.indexOf(idx);\n'+
'    return (i > -1 && i < order.length - 1) ? order[i+1] : null;\n'+
'  }\n'+
'  root.querySelectorAll(\'input[type="radio"]\').forEach(function(radio){\n'+
'    radio.addEventListener("change", function(){\n'+
'      var idx = radio.getAttribute("data-idx") || "";\n'+
'      Object.keys(players).forEach(function(k){\n'+
'        var pl = players[k];\n'+
'        if(!pl) return;\n'+
'        if(k === idx){ if(pl.playVideo) pl.playVideo(); }\n'+
'        else { if(pl.stopVideo) pl.stopVideo(); }\n'+
'      });\n'+
'    });\n'+
'  });\n'+
'  root.querySelectorAll("[data-idx]").forEach(function(el){\n'+
'    var icon = el.querySelector(".'+p+'-play");\n'+
'    if(!icon) return;\n'+
'    icon.addEventListener("click", function(e){\n'+
'      var idx = el.getAttribute("data-idx");\n'+
'      var radio = radiosByIdx[idx];\n'+
'      var pl = players[idx];\n'+
'      if(radio && radio.checked && pl && pl.getPlayerState){\n'+
'        e.preventDefault(); e.stopPropagation();\n'+
'        var st = pl.getPlayerState();\n'+
'        if(st === 1){ pl.pauseVideo(); } else { pl.playVideo(); }\n'+
'      }\n'+
'    });\n'+
'  });\n'+
'  function onStateChange(idx){\n'+
'    return function(e){\n'+
'      var row = root.querySelector(".'+p+'-row[data-idx=\\""+idx+"\\"]");\n'+
'      if(e.data === 1){ if(row) row.classList.remove("is-paused"); }\n'+
'      else if(e.data === 2){ if(row) row.classList.add("is-paused"); }\n'+
'      else if(e.data === 0){\n'+
'        if(row) row.classList.remove("is-paused");\n'+
'        selectSong(nextIdx(idx));\n'+
'      }\n'+
'    };\n'+
'  }\n'+
'  function initPlayers(){\n'+
'    Object.keys(frames).forEach(function(idx){\n'+
'      players[idx] = new YT.Player(frames[idx], { events: { onStateChange: onStateChange(idx) } });\n'+
'    });\n'+
'  }\n'+
'  if(window.YT && window.YT.Player){ initPlayers(); }\n'+
'  else {\n'+
'    window.onYouTubeIframeAPIReady = (function(prev){ return function(){ if(prev) prev(); initPlayers(); }; })(window.onYouTubeIframeAPIReady);\n'+
'    if(!window.__ytApiTagAdded){\n'+
'      window.__ytApiTagAdded = true;\n'+
'      var tag = document.createElement("script");\n'+
'      tag.src = "https://www.youtube.com/iframe_api";\n'+
'      document.head.appendChild(tag);\n'+
'    }\n'+
'  }\n'+
'})();\n'+
'<\/script>' : '';

    return (
'<div class="'+p+'">\n'+
style+'\n'+
radios+'\n'+
'  <div class="'+p+'-header">\n'+
(coverBlock ? '    '+coverBlock+'\n' : '')+
'    <p class="'+p+'-title">'+escapeHtml(title)+'</p>\n'+
(desc ? '    <p class="'+p+'-desc">'+escapeHtml(desc)+'</p>\n' : '')+
'  </div>\n'+
(nowPlaying ? nowPlaying+'\n' : '')+
moreToggle+'\n'+
'  <div class="'+p+'-list">\n      '+mainRows+'\n  </div>\n'+
(extraBlock ? extraBlock+'\n' : '')+
(moreBtn ? moreBtn+'\n' : '')+
script+'\n'+
'</div>'
    );
  }

  // 미리보기 iframe 안에서 실제 렌더링된 높이를 부모 창으로 알려주는 관찰 스크립트.
  // (load 이벤트 한 번만 재는 방식은 폰트가 늦게 로드되거나 내용이 나중에 바뀌면 크기가 안 맞을 수 있어서,
  //  ResizeObserver로 계속 감시하다가 postMessage로 알려주는 방식을 사용)
  // 매 렌더링마다 세대(gen) 번호를 새로 매겨서, 이전 iframe에서 뒤늦게 도착하는 메시지(예: 삭제/더보기 닫기 직후
  // 이전 내용 기준으로 늦게 온 리포트)가 지금 크기를 다시 늘려버리는 문제를 막는다.
  const MAX_PREVIEW_HEIGHT = 640; // 이 값을 넘으면 미리보기 안에서 스크롤로 확인
  let previewGen = 0;

  function buildPreviewResizeScript(gen){
    return '<script>(function(){'+
      'var gen='+gen+';'+
      'function report(){ try{ parent.postMessage({__plwPreviewHeight: document.documentElement.scrollHeight, __plwPreviewGen: gen}, "*"); }catch(e){} }'+
      'if(window.ResizeObserver){ new ResizeObserver(report).observe(document.body); } '+
      'window.addEventListener("load", report); '+
      'setTimeout(report, 50); setTimeout(report, 300); setTimeout(report, 1000);'+
    '})();<\/script>';
  }

  window.addEventListener('message', function(e){
    if(e && e.data && typeof e.data.__plwPreviewHeight === 'number' && e.data.__plwPreviewGen === previewGen){
      const h = Math.min(e.data.__plwPreviewHeight + 4, MAX_PREVIEW_HEIGHT);
      els.previewFrame.style.height = h + 'px';
    }
  });

  function renderAll(){
    previewGen += 1;
    const gen = previewGen;
    const html = buildWidgetHtml();
    els.outputCode.value = html;
    els.previewFrame.srcdoc = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;padding:16px 0;}</style></head><body>' + html + buildPreviewResizeScript(gen) + '</body></html>';
    if(els.songCountPill){ els.songCountPill.textContent = '곡 ' + state.songs.length + '개'; }
    scheduleSave();
  }

  const restored = loadState();
  syncFormFromState();
  renderBuilderSongs();
  renderAll();
  updateSaveStatus(restored ? '이전 작업을 불러왔어요' : '자동 저장 준비됨');

})();
