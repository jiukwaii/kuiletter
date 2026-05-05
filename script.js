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
    const shortResult = document.getElementById("shortResult");
    const letterResult = document.getElementById("letterResult");
    const calmResult = document.getElementById("calmResult");
    const riskResult = document.getElementById("riskResult");
    const adviceResult = document.getElementById("adviceResult");
    const quoteResult = document.getElementById("quoteResult");
    const adjustedResultCard = document.getElementById("adjustedResultCard");
    const adjustedTag = document.getElementById("adjustedTag");
    const adjustedResult = document.getElementById("adjustedResult");
    const toast = document.getElementById("toast");

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

    generateBtn.addEventListener("click", () => {
      const userText = state.text || "我不是要吵架，只是有些话憋着不说也不舒服。";

      generateBtn.disabled = true;
      loadingBox.classList.add("show");
      resultsSection.classList.remove("show");

      document.querySelectorAll(".light-feedback .mini-option").forEach(opt => opt.classList.remove("active"));
      adjustedResultCard.classList.remove("show");

      setTimeout(() => {
        const outputs = createMockOutputs(state.concern, state.tone, userText);
        riskResult.textContent = outputs.risk;
        adviceResult.textContent = outputs.advice;
        quoteResult.innerHTML = outputs.quoted;
        shortResult.textContent = outputs.short;
        letterResult.textContent = outputs.letter;
        calmResult.textContent = outputs.calm;

        loadingBox.classList.remove("show");
        generateBtn.disabled = false;
        resultsSection.classList.add("show");
        
        const yOffset = 0; 
        const y = resultsSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({top: y, behavior: 'smooth'});
      }, 1200);
    });

    function extractSignalWords(text) {
      const riskyWords = [
        "随便", "算了", "你每次", "你总是", "为什么", "到底",
        "无所谓", "都是你", "不想理", "对不起", "拜托", "求你",
        "你根本", "你从来", "受够", "烦死", "懒得说", "随你"
      ];

      return riskyWords.filter(word => text.includes(word)).slice(0, 3);
    }

    function createMockOutputs(concern, tone, text) {
      const userSnippet = text.length > 60 ? text.slice(0, 60) + "..." : text;
      const signals = extractSignalWords(text);
      const quoted = signals.length
        ? `我注意到这段里有几个地方可能需要小心：<strong>${signals.join("、")}</strong>。`
        : "我没有看到特别刺耳的词，但这段话的表达顺序还可以更清楚。";

      const riskMap = {
        "我怕太卑微": {
          risk: "这段话可能把重心放在讨好或反复解释上，让你显得太委屈，也容易让对方忽略你真正想表达的重点。",
          advice: "保留真诚，但减少过度道歉。先说清楚你的感受和边界，再给对方回应空间。"
        },
        "我怕太冲": {
          risk: "这段话可能会让对方感觉被指责，容易把沟通变成争辩。",
          advice: "先用“我感受到……”表达自己的状态，再说明具体事件，避免直接给对方下判断。"
        },
        "我怕对方误会": {
          risk: "这段话的重点可能不够清楚，对方可能只看到情绪，而没有理解你的真正意思。",
          advice: "先讲目的，再讲感受，最后补一句你不是要吵架，而是想把话说清楚。"
        },
        "我怕说太多": {
          risk: "这段话如果太长，可能会让对方有压力，也可能让你的重点被淹没。",
          advice: "把内容压缩成三部分：发生了什么、你的感受、你希望接下来怎样。"
        },
        "我怕不够清楚": {
          risk: "这段话可能表达了情绪，但没有明确说出你真正想要对方理解的重点。",
          advice: "直接点出核心信息，减少绕圈，让对方知道你是在解释、表达感受，还是提出边界。"
        },
        "我怕关系变尴尬": {
          risk: "这段话如果太沉重，可能让聊天气氛变僵，也可能让对方不知道怎么回应。",
          advice: "语气保持轻一点，给对方台阶，也给自己留空间，不把一次对话变成最终判决。"
        }
      };


      const check = riskMap[concern] || riskMap["我怕太卑微"];

      const toneStyle = {
        "温柔但不卑微": {
          opening: "我想了想，还是想把这件事说清楚。",
          close: "你不用马上回应，我只是希望这件事不要一直卡在我们之间。"
        },
        "真诚但不给压力": {
          opening: "我想认真说一下我的想法。",
          close: "你可以慢慢看，不用急着回复。"
        },
        "像平常聊天一样": {
          opening: "我想跟你说一下刚才那件事。",
          close: "我不是想吵架，只是想讲清楚一点。"
        },
        "保持边界但不冷漠": {
          opening: "我想简单说明一下我的感受和边界。",
          close: "我尊重你的想法，也希望我的感受能被理解。"
        }
      }[tone] || {
        opening: "我想把这件事说清楚。",
        close: "你不用马上回应，我只是希望我们不要误会彼此。"
      };

      return {
        risk: check.risk,
        advice: check.advice,
        quoted,
        short: `${toneStyle.opening}

关于刚才那段话，我其实有点在意。我不是想责怪你，只是想让你知道我的感受。

${toneStyle.close}`,
        letter: `${toneStyle.opening}

我看了自己原本想发的内容：
“${userSnippet}”

我真正想表达的是：这件事让我有点不舒服，但我不希望我们把它变成争吵。我希望可以把话说清楚，而不是彼此猜来猜去。

${toneStyle.close}`,
        calm: `我想把这件事说清楚，但不想把语气说重。

我的重点不是要追究谁对谁错，而是希望你知道这件事对我有影响。之后如果可以，我希望我们都能用更舒服的方式沟通。

${toneStyle.close}`
      };
    }

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
      const selectedVersion = document.querySelector(".adjust-version-group .adjust-option.active");
      const targetId = selectedVersion ? selectedVersion.dataset.adjustVersion : "shortResult";
      const source = document.getElementById(targetId);
      return source ? source.textContent.trim() : "";
    }

    function rewriteAdjustText(text, direction) {
      const compact = text.replace(/\n{2,}/g, "\n").trim();
      const directionMap = {
        natural: {
          label: "已帮你改得更自然一点",
          prefix: "我想自然一点说："
        },
        shorter: {
          label: "已帮你改得更短一点",
          prefix: "简单说就是："
        },
        "less-humble": {
          label: "已帮你减少卑微感",
          prefix: "我想真诚一点说，但也保留自己的边界："
        },
        "less-formal": {
          label: "已帮你改得不那么正式",
          prefix: "换成比较像聊天的说法："
        },
        whatsapp: {
          label: "已帮你改得更像 WhatsApp",
          prefix: "可以这样发："
        },
        boundary: {
          label: "已帮你加强边界感",
          prefix: "我想把话说清楚，也保留一点边界："
        }
      };
      const setting = directionMap[direction] || directionMap.natural;
      const shorterText = compact.length > 180 ? compact.slice(0, 180) + "……" : compact;
      return {
        label: setting.label,
        text: `${setting.prefix}

${shorterText}`
      };
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

        const result = rewriteAdjustText(sourceText, button.dataset.adjustDirection);
        adjustedTag.textContent = result.label;
        adjustedResult.textContent = result.text;
        adjustedResultCard.classList.add("show");
        showToast(result.label);
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
