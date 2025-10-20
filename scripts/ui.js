(function($){
  // UI layer with jQuery
  window.App = window.App || {};
  const App = window.App;

  App.state = { result: null };

  App.config = { refreshMs: 60000 };
  App.timers = { interval: null };

  App.init = function(){
    // Load last result from storage if any
    try { App.state.result = App.Storage.load(); } catch(e) { App.state.result = null; }

    // Bind interactions
    $(document).on('click', '[data-action="check"]', function(){
      App.runCheck(true);
    });

    $(document).on('click', '[data-action="share"]', function(){
      App.shareResult();
    });
  };

  App.render = function(){
    // Initial render
    if (App.state.result) {
      App.updateUI(App.state.result);
    } else {
      App.setChecking(true);
    }
    // Always perform a fresh check on load
    App.runCheck(false);

    // Start auto-refresh and request notification permission
    App.startAutoRefresh();
    App.requestNotifyPermissionOnce();
  };

  App.setChecking = function(isChecking){
    const $icon = $('#status-icon');
    const $text = $('#status-text');
    const $chip = $('#status-chip');
    if (isChecking){
      $icon.removeClass('bg-success bg-danger').addClass('bg-muted');
      $text.text('...');
      $chip.text('Checking');
      $('.pulse').addClass('animate-pulse-slow');
    } else {
      $('.pulse').removeClass('animate-pulse-slow');
    }
  };

  App.updateUI = function(result){
    App.setChecking(false);
    const $icon = $('#status-icon');
    const $text = $('#status-text');
    const $chip = $('#status-chip');
    const $sr = $('#sr-status');

    if (result.down === true){
      // AWS is down -> show Yes
      $text.text('Yes');
      $chip.text('AWS is experiencing issues');
      $icon.removeClass('bg-success bg-muted').addClass('bg-danger');
      $sr.text('Yes, AWS is down.');
      $('body').attr('data-status','down');
    } else if (result.down === false){
      // AWS is not down -> show No
      $text.text('No');
      $chip.text('All clear');
      $icon.removeClass('bg-danger bg-muted').addClass('bg-success');
      $sr.text('No, AWS is not down.');
      $('body').attr('data-status','up');
    } else {
      $text.text('Unknown');
      $chip.text('Could not verify');
      $icon.removeClass('bg-success bg-danger').addClass('bg-muted');
      $sr.text('Unable to determine AWS status.');
      $('body').attr('data-status','unknown');
    }

    $('#last-checked').text(App.Helpers.formatTime(result.timestamp));
    $('#source-label').text(App.simplifySourceLabel(result.source));
    if (result.error){
      $('#error-note').text(result.error).show();
    } else {
      $('#error-note').hide();
    }
  };

  App.runCheck = function(userTriggered){

    App.setChecking(true);
    var prevDown = (App.state && App.state.result) ? App.state.result.down : undefined;
    return App.Checker.checkNow().then(function(res){
      App.state.result = res;
      App.updateUI(res);
      App.flashCard();
      if (typeof prevDown !== 'undefined' && prevDown !== res.down) {
        App.notifyChange(prevDown, res.down, res);
      }
      return res;
    }).catch(function(err){
      console.error('Check failed', err);
      var fallback = { down: null, timestamp: Date.now(), source: 'error', error: 'Check failed' };
      App.updateUI(fallback);
      return fallback;
    });
  };

  App.flashCard = function(){
    if (App.Helpers.isReducedMotion()) return;
    const $card = $('#result-card');
    $card.stop(true,true).css({ boxShadow: '0 0 0 0 rgba(13,148,136,0.0)' })
      .animate({ }, 0, function(){
        $card.addClass('ring-2 ring-teal-300 ring-offset-2');
      })
      .delay(220)
      .queue(function(next){
        $card.removeClass('ring-2 ring-teal-300 ring-offset-2');
        next();
      });
  };

  App.shareResult = function(){
    try {
      const r = App.state.result || {};
      const word = r.down === true ? 'Yes' : (r.down === false ? 'No' : 'Unknown');
      const text = 'isAWSback: ' + word + '. Checked at ' + App.Helpers.formatTime(r.timestamp) + '.';
      if (navigator.share){
        navigator.share({ title: 'isAWSback', text: text, url: window.location.href }).catch(function(){});
        return;
      }
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){ App.toast('Copied to clipboard'); }).catch(function(){ App.toast('Copy failed'); });
      } else {
        // Fallback hidden textarea copy
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); App.toast('Copied'); } catch(e){ App.toast('Copy failed'); }
        document.body.removeChild(ta);
      }
    } catch(e){ App.toast('Share unavailable'); }
  };

  App.toast = function(message){
    const $t = $('#toast');
    $t.find('[data-role="message"]').text(message);
    $t.stop(true,true).fadeIn(120).delay(1200).fadeOut(350);
  };


  // Auto-refresh helpers
  App.startAutoRefresh = function(){
    try {
      if (App.timers && App.timers.interval) { clearInterval(App.timers.interval); }
      App.timers = App.timers || {};
      var ms = (App.config && App.config.refreshMs) || 60000;
      App.timers.interval = setInterval(function(){ App.runCheck(false); }, ms);
    } catch(e){}
  };
  App.stopAutoRefresh = function(){
    try { if (App.timers && App.timers.interval) { clearInterval(App.timers.interval); App.timers.interval = null; } } catch(e){}
  };

  // Notification helpers
  App.requestNotifyPermissionOnce = function(){
    try {
      if (!('Notification' in window)) return;
      var askedKey = 'isawsback:notify-asked';
      if (localStorage.getItem(askedKey)) return;
      localStorage.setItem(askedKey, '1');
      if (Notification.permission === 'default') {
        Notification.requestPermission().catch(function(){});
      }
    } catch(e){}
  };

  App.notifyChange = function(prevDown, nextDown, result){
    try {
      var prevWord = prevDown === true ? 'Yes' : (prevDown === false ? 'No' : 'Unknown');
      var nextWord = nextDown === true ? 'Yes' : (nextDown === false ? 'No' : 'Unknown');
      var message = 'AWS status changed: ' + nextWord + ' (was ' + prevWord + ').';
      App.toast(message);
      if ('vibrate' in navigator) { try { navigator.vibrate([120,60,120]); } catch(e){} }
      if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification('isAWSback', { body: message }); } catch(e){}
      }
      try { document.title = nextWord + ' • isAWSback'; } catch(e){}
    } catch(e){}
  };
  App.simplifySourceLabel = function(src){
    if (!src) return 'n/a';
    if (String(src).indexOf('r.jina.ai') >= 0) return 'Mirror';
    if (String(src).indexOf('allorigins') >= 0) return 'Mirror';
    if (src === 'error') return 'error';
    return 'Direct';
  };

})(jQuery);
