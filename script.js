const state = {
      concern: "我怕太卑微",
      tone: "温柔但不卑微",
      text: ""
    };

    window.addEventListener('DOMContentLoaded', () => {
      const rawInput = document.getElementById("rawInput");
      if (rawInput && rawInput.value) {
        state.text = rawInput.value.trim();
        document.getElementById("charCount").textContent = rawInput.value.length;
      }
    });

    const rawInput = document.getElementById("rawInput");
    const charCount = document.getElementById("charCount");
    const generateBtn = document.getElementById("generateBtn");
    const loadingBox = document.getElementById("loadingBox");
    const resultsSection = document.getElementById("results-section");
    const recommendationResult = document.getElementById("recommendationResult");
    const stabilityText = document.getElementById("stabilityText");
    const copyRecommendation = document.getElementById("copyRecommendation");
    const toast = document.getElementById("toast");

    // Main copy recommendation
    copyRecommendation.addEventListener("click", async () => {
      const text = recommendationResult.textContent;
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
        showToast("已复制建议内容");
      } catch (error) {
        showToast("复制失败，请手动选择");
      }
    });

    document.querySelectorAll(".choice-grid").forEach(group => {
      group.addEventListener("click", event => {
        const button = event.target.closest(".choice");
        if (!button) return;

        group.querySelectorAll(".choice").forEach(item => item.classList.remove("active"));
        button.classList.add("active");

        const type = group.dataset.group;
        state[type] = button.dataset.value;
      });
    });

    rawInput.addEventListener("input", () => {
      const val = rawInput.value;
      if (val.length > 500) {
        rawInput.value = val.substring(0, 500);
        showToast("这段有点长，可以先贴最想发的那一小段。");
      }
      state.text = rawInput.value.trim();
      charCount.textContent = rawInput.value.length;
    });

    generateBtn.addEventListener("click", async () => {
      const userText = state.text.trim();
      if (!userText) {
        showToast("请先贴上你想整理的内容。");
        return;
      }
      if (userText.length > 500) {
        showToast("这段有点长，可以先贴最想发的那一小段。");
        return;
      }

      generateBtn.disabled = true;
      loadingBox.classList.add("show");
      resultsSection.classList.remove("show");

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: userText
          })
        });

        const outputs = await response.json();
        if (!response.ok) {
          throw new Error(outputs.error || "现在生成有点频繁，可以等一下再试，或先缩短输入内容。");
        }

        // Fill data
        recommendationResult.textContent = outputs.recommendedResult || "";
        stabilityText.textContent = outputs.explanation || "这一版已经平衡了原意与语气，可以放心发送。";

        resultsSection.classList.add("show");
        
        // Smooth scroll to the main recommendation card
        setTimeout(() => {
          const cardTop = resultsSection.getBoundingClientRect().top + window.pageYOffset - 20;
          window.scrollTo({ top: cardTop, behavior: "smooth" });
        }, 100);
      } catch (error) {
        console.error('Frontend Error:', error);
        showToast(error.message || "现在生成有点频繁，可以等一下再试，或先缩短输入内容。");
      } finally {
        loadingBox.classList.remove("show");
        generateBtn.disabled = false;
      }
    });

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2500);
    }


    // Mobile-only Scroll to Top button with scroll-direction awareness
    window.addEventListener('DOMContentLoaded', () => {
      const backToTopButton = document.querySelector('.back-to-top');
      if (!backToTopButton) return;

      const mobileQuery = window.matchMedia('(max-width: 768px)');
      let lastScrollY = window.scrollY;

      const hideBackToTopButton = () => {
        backToTopButton.classList.remove('is-visible');
      };

      const updateBackToTopVisibility = () => {
        if (!mobileQuery.matches) {
          hideBackToTopButton();
          lastScrollY = window.scrollY;
          return;
        }

        const currentScrollY = window.scrollY;
        const showAfter = Math.max(300, window.innerHeight * 0.35);
        const scrollDelta = Math.abs(currentScrollY - lastScrollY);

        if (currentScrollY <= showAfter) {
          hideBackToTopButton();
          lastScrollY = currentScrollY;
          return;
        }

        if (scrollDelta < 8) return;

        if (currentScrollY > lastScrollY) {
          // User is scrolling down: keep the reading area clean.
          hideBackToTopButton();
        } else {
          // User is scrolling up: show the shortcut back to the top.
          backToTopButton.classList.add('is-visible');
        }

        lastScrollY = currentScrollY;
      };

      backToTopButton.addEventListener('click', () => {
        hideBackToTopButton();
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });

      window.addEventListener('scroll', updateBackToTopVisibility, { passive: true });
      window.addEventListener('resize', () => {
        lastScrollY = window.scrollY;
        updateBackToTopVisibility();
      });

      if (typeof mobileQuery.addEventListener === 'function') {
        mobileQuery.addEventListener('change', updateBackToTopVisibility);
      } else if (typeof mobileQuery.addListener === 'function') {
        mobileQuery.addListener(updateBackToTopVisibility);
      }

      updateBackToTopVisibility();
    });
