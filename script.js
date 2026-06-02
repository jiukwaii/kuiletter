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
    const shortResult = document.getElementById("shortResult");
    const letterResult = document.getElementById("letterResult");
    const calmResult = document.getElementById("calmResult");
    const adjustedResultCard = document.getElementById("adjustedResultCard");
    const adjustedTag = document.getElementById("adjustedTag");
    const adjustedResult = document.getElementById("adjustedResult");
    const otherVersionsContainer = document.getElementById("otherVersionsContainer");
    const toggleOtherVersions = document.getElementById("toggleOtherVersions");
    const copyRecommendation = document.getElementById("copyRecommendation");
    const toast = document.getElementById("toast");

    // Toggle other versions
    toggleOtherVersions.addEventListener("click", () => {
      otherVersionsContainer.classList.toggle("show");
      const isShowing = otherVersionsContainer.classList.contains("show");
      toggleOtherVersions.querySelector("span").textContent = isShowing ? "收起其他说法" : "看其他说法";
      toggleOtherVersions.querySelector("svg").style.transform = isShowing ? "rotate(180deg)" : "rotate(0deg)";
    });

    // Main copy recommendation
    copyRecommendation.addEventListener("click", async () => {
      const text = recommendationResult.textContent;
      try {
        await navigator.clipboard.writeText(text);
        showToast("已复制最推荐版本");
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
      state.text = rawInput.value.trim();
      charCount.textContent = rawInput.value.length;
    });

    generateBtn.addEventListener("click", async () => {
      const userText = state.text.trim();
      if (!userText) {
        showToast("请先贴上你想整理的内容。");
        return;
      }

      generateBtn.disabled = true;
      loadingBox.classList.add("show");
      resultsSection.classList.remove("show");
      otherVersionsContainer.classList.remove("show");
      toggleOtherVersions.querySelector("span").textContent = "看其他说法";
      toggleOtherVersions.querySelector("svg").style.transform = "rotate(0deg)";

      document.querySelectorAll(".light-feedback .mini-option").forEach(opt => opt.classList.remove("active"));
      adjustedResultCard.classList.remove("show");

      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: userText,
            concern: state.concern,
            tone: state.tone
          })
        });

        const outputs = await response.json();
        if (!response.ok) {
          throw new Error(outputs.error || "葵刚刚没有整理成功，请稍后再试。");
        }

        // Fill data
        shortResult.textContent = outputs.shortResult || "";
        letterResult.textContent = outputs.letterResult || "";
        calmResult.textContent = outputs.calmResult || "";

        // Recommended Version Logic
        let recommendedText = "";
        let recommendedTag = "";
        if (state.concern === "我怕太卑微") {
          recommendedText = outputs.calmResult;
          recommendedTag = "有边界版：最适合不想委屈自己";
        } else if (state.concern === "我怕太冲" || state.concern === "我怕对方误会") {
          recommendedText = outputs.letterResult;
          recommendedTag = "温和版：最适合降低冲突";
        } else {
          recommendedText = outputs.shortResult;
          recommendedTag = "短版：最适合直接私讯发";
        }

        recommendationResult.textContent = recommendedText;
        document.getElementById("recommendationTag").textContent = recommendedTag;

        // Stability Text Logic
        const stabilityLines = [];
        if (outputs.riskResult) stabilityLines.push(outputs.riskResult);
        if (outputs.adviceResult) stabilityLines.push(outputs.adviceResult);
        stabilityText.textContent = stabilityLines.join(" ");

        resultsSection.classList.add("show");
        const yOffset = 0;
        const y = resultsSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: "smooth" });
      } catch (error) {
        console.error('Frontend Error:', error);
        showToast(error.message || "连接失败，请检查网络或稍后再试。");
      } finally {
        loadingBox.classList.remove("show");
        generateBtn.disabled = false;
      }
    });

    document.querySelectorAll(".copy-button").forEach(button => {
      button.addEventListener("click", async () => {
        const targetId = button.dataset.copy;
        const text = document.getElementById(targetId).textContent;
        try {
          await navigator.clipboard.writeText(text);
          showToast("已复制到剪贴板");
        } catch (error) {
          showToast("复制失败，请手动选择");
        }
      });
    });

    document.querySelectorAll(".adjust-version-group .adjust-option").forEach(button => {
      button.addEventListener("click", () => {
        const group = button.closest(".adjust-version-group");
        group.querySelectorAll(".adjust-option").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
      });
    });

    function getSelectedAdjustText() {
      // Since we removed the version selection buttons, we default to the recommendationResult
      // unless the user has already adjusted once, then we might want to adjust the adjusted result?
      // For simplicity and following the new IA, we adjust the main recommended version.
      return recommendationResult.textContent.trim();
    }

    document.querySelectorAll(".adjust-direction-grid .adjust-option").forEach(button => {
      button.addEventListener("click", () => {
        const group = button.closest(".adjust-direction-grid");
        group.querySelectorAll(".adjust-option").forEach(item => item.classList.remove("active"));
        button.classList.add("active");

        const sourceText = getSelectedAdjustText();
        if (!sourceText) {
          showToast("先生成版本，再进行调整");
          return;
        }

        button.disabled = true;
        showToast("葵正在重新调整……");

        fetch("/api/adjust", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            text: sourceText,
            direction: button.dataset.adjustDirection
          })
        })
          .then(async response => {
            const result = await response.json();
            if (!response.ok) {
              throw new Error(result.error || "调整失败");
            }
            adjustedTag.textContent = result.label || "葵重新整理了一版";
            adjustedResult.textContent = result.text || "";
            adjustedResultCard.classList.add("show");
            showToast(result.label || "已完成调整");
          })
          .catch(error => {
            console.error(error);
            showToast(error.message || "调整失败，请检查 API 设置");
          })
          .finally(() => {
            button.disabled = false;
          });
      });
    });

    document.querySelectorAll(".light-feedback .mini-option").forEach(button => {
      button.addEventListener("click", () => {
        const group = button.closest(".feedback-buttons");
        group.querySelectorAll(".mini-option").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        showToast("感谢你的反馈！");
      });
    });

    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");
      setTimeout(() => toast.classList.remove("show"), 2000);
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
