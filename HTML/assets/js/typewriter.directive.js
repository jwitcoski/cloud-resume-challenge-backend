(function () {
  'use strict';

  angular.module('resumeApp')
    .directive('typewriter', typewriterDirective);

  function typewriterDirective($timeout) {
    return {
      restrict: 'A',
      scope: { phrases: '=typewriter' },
      link: function (scope, element) {
        var typingSpeed = 100;
        var erasingSpeed = 50;
        var delayBetweenTexts = 1000;
        var textIndex = 0;
        var charIndex = 0;
        var isTyping = true;
        var phrases = scope.phrases || ['Software Developer', 'Geographer'];

        function animate() {
          var currentText = phrases[textIndex];
          if (!currentText) return;

          if (isTyping) {
            if (charIndex < currentText.length) {
              element.text(currentText.substring(0, charIndex + 1));
              charIndex++;
              $timeout(animate, typingSpeed);
            } else {
              isTyping = false;
              $timeout(animate, delayBetweenTexts);
            }
          } else {
            if (charIndex > 0) {
              charIndex--;
              element.text(currentText.substring(0, charIndex));
              $timeout(animate, erasingSpeed);
            } else {
              isTyping = true;
              textIndex = (textIndex + 1) % phrases.length;
              $timeout(animate, typingSpeed);
            }
          }
        }

        if (phrases.length) {
          $timeout(animate, 500);
        }
      }
    };
  }
})();
