function sx(selector) {

  return new SXObject(selector);
}

class SXObject {
  static intervals = new Map();

  constructor(selector) {
    this.selector = selector;
    this.target = document.querySelector(selector);
    this.response = null;
    this.request = null;
    this.errorHandler = null;
    this.oobConfigs = [];
    this.intervalId = null;
    this.jsonData = null;

    this.doFill = false;
    this.swapMethod = null;
    this.effectName = null;
    this.effectDuration = 200;
  }

  fill() {
    this.doFill = true;
    this.request = this.request || Promise.resolve();
    this.request = this.request.then(() => {
      if (!this.target) {
        console.error(`Form with selector "${this.selector}" not found.`);
        return this;
      }

      if (!this.target.tagName || this.target.tagName.toLowerCase() !== 'form') {
        console.error(`Element with selector "${this.selector}" is not a form.`);
        return this;
      }

      if (!this.jsonData && this.response) {
        try {
          this.jsonData = JSON.parse(this.response);
        } catch (error) {
          console.error('Error parsing JSON data:', error);
          return this;
        }
      }

      if (!this.jsonData) {
        console.error('No JSON data available to fill the form.');
        return this;
      }

      this._fillFormWithJson(this.jsonData);

      return this;
    });

    return this;
  }

  _fillFormWithJson(jsonData) {
    const form = this.target;

    for (const key in jsonData) {
      if (jsonData.hasOwnProperty(key)) {
        const value = jsonData[key];

        const elements = form.querySelectorAll(`[name="${key}"]`);

        if (elements.length === 0) {
          console.warn(`No form element with name "${key}" found. Skipping.`);
          continue;
        }

        elements.forEach(element => {
          this._populateElement(element, value);
        });
      }
    }
  }

  _populateElement(element, value) {

    if (element.tagName === 'SELECT') {
      this._handleSelectElement(element, value);
      return;
    }

    if (element.tagName === 'TEXTAREA') {
      element.value = value;
      return;
    }

    if (element.tagName === 'INPUT') {
      this._handleInputElement(element, value);
      return;
    }
  }

  _handleInputElement(element, value) {
    switch (element.type.toLowerCase()) {
      case 'checkbox':
        if (Array.isArray(value)) {
          element.checked = value.includes(element.value);
        } else if (typeof value === 'boolean') {
          element.checked = value;
        } else {
          element.checked = element.value === String(value);
        }
        break;

      case 'radio':
        element.checked = (element.value === String(value));
        break;

      case 'color':
        if (value && /^#([0-9A-Fa-f]{3}){1,2}$/i.test(value)) {
          element.value = value;
        } else if (value) {
          console.warn(`Invalid color value "${value}" for color input.`);
        }
        break;

      case 'number':
      case 'range':
        if (value !== null && value !== undefined) {
          const numericValue = Number(value);
          if (!isNaN(numericValue)) {
            element.value = numericValue;
          } else {
            console.warn(`Invalid number value "${value}" for input type "${element.type}".`);
          }
        }
        break;

      case 'date':
      case 'month':
      case 'week':
      case 'time':
        if (value) {
          element.value = value;
          if (element.value !== value) {
            console.warn(`Value "${value}" is not valid for input type "${element.type}".`);
          }
        }
        break;

      default:
        element.value = value;
        break;
    }
  }

  _handleSelectElement(element, value) {
    if (element.multiple) {
      const values = Array.isArray(value) ? value : [value];
      Array.from(element.options).forEach(option => {
        option.selected = values.includes(option.value);
      });
    } else {
      const selectedValue = Array.isArray(value) && value.length > 0 ? value[0] : value;
      element.value = selectedValue;

      if (element.value !== selectedValue && selectedValue !== undefined) {
        console.warn(`Value "${selectedValue}" not found in select options for element "${element.name}".`);
      }
    }
  }

  get(url) {
    this.url = url;

    const performRequest = () => {
      this.request = fetch(url)
        .then(response => {
          if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
          }
          return response.text();
        })
        .then(data => {
          this.response = data;

          try {
            this.jsonData = JSON.parse(data);
          } catch (e) {

            this.jsonData = null;
          }

          this._processOOBConfigs();
          return this;
        })
        .catch(error => {
          if (this.errorHandler) {
            this.errorHandler(error);
          } else {
            console.error('Error in GET request:', error);
          }
        });
    };

    performRequest();
    return this;
  }

  post(url) {
    this.url = url;
    return this;
  }

  with(formSelector) {
    this.formSelector = formSelector;

    const performRequest = () => {
      const form = document.querySelector(formSelector);
      if (!form) {
        const error = new Error(`Form with selector "${formSelector}" not found.`);
        if (this.errorHandler) {
          this.errorHandler(error);
        } else {
          console.error(error.message);
        }
        this.request = Promise.reject(error);
        return this;
      }

      const csrfToken = form.querySelector('input[name="_csrf"]')?.value;

      const formData = new FormData(form);
      const data = {};
      for (const [key, value] of formData.entries()) {
        const convertedValue = this._convertValue(value);

        if (data.hasOwnProperty(key)) {
          if (!Array.isArray(data[key])) {
            data[key] = [data[key]];
          }
          data[key].push(convertedValue);
        } else {
          data[key] = convertedValue;
        }
      }

      Object.keys(data).forEach(key => {
        if (Array.isArray(data[key]) && data[key].length === 1) {
          data[key] = data[key][0];
        }
      });

      const headers = {
        'Content-Type': 'application/json'
      };
      if (csrfToken) {
        headers['X-CSRF-TOKEN'] = csrfToken;
      }

      this.request = fetch(this.url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(data)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.text();
      })
      .then(data => {
        this.response = data;
        try {
          this.jsonData = JSON.parse(data);
        } catch (e) {
          this.jsonData = null;
        }
        this._processOOBConfigs();
        return this;
      })
      .catch(error => {
        if (this.errorHandler) {
          this.errorHandler(error);
        } else {
          console.error('Error in POST request:', error);
        }
        throw error;
      });
    };

    performRequest();
    return this;
  }

  _convertValue(value) {

    if (value === "") return value;

    if (/^-?\d+$/.test(value) && !/^0\d+/.test(value)) {
      return Number(value);
    }

    return value;
  }

  swap(method) {
    this.swapMethod = method;

    if (!this.target) {
      console.error(`Element with selector "${this.selector}" not found.`);
      return this;
    }

    this.request = this.request || Promise.resolve();
    this.request = this.request.then(() => {
      if (this.response) {
        if (method === 'innerHTML') {
          this.target.innerHTML = this.response;
        } else if (method === 'outerHTML') {
          this.target.outerHTML = this.response;
        } else if (method === 'beforeend') {
          this.target.insertAdjacentHTML('beforeend', this.response);
        } else if (method === 'afterbegin') {
          this.target.insertAdjacentHTML('afterbegin', this.response);
        }
      }
      return this;
    });
    return this;
  }

  effect(effectName, duration = 200) {
    this.effectName = effectName;
    this.effectDuration = duration;

    this.request = this.request || Promise.resolve();
    this.request = this.request.then(() => {
      if (!this.target) return this;
      this._applyEffect(this.target, effectName, duration);
      return this;
    });
    return this;
  }

  oob(...configs) {
    this.oobConfigs.push(...configs);
    return this;
  }

  _processOOBConfigs() {
    this.oobConfigs.forEach(config => {
      const targetSelector = config.id || this.selector;
      const targetElement = document.querySelector(targetSelector);

      if (!targetElement) {
        console.error(`OOB target not found: ${targetSelector}`);
        return;
      }

      if (config.swap) {
        switch(config.swap) {
          case 'innerHTML':
            targetElement.innerHTML = this.response;
            break;
          case 'outerHTML':
            targetElement.outerHTML = this.response;
            break;
          case 'beforeend':
            targetElement.insertAdjacentHTML('beforeend', this.response);
            break;
          case 'afterbegin':
            targetElement.insertAdjacentHTML('afterbegin', this.response);
            break;
          default:
            console.error(`Unknown swap method: ${config.swap}`);
        }
      }

      if (config.effect) {
        this._applyEffect(
          targetElement,
          config.effect,
          config.duration || 200
        );
      }
    });
  }

  _applyEffect(element, effectName, duration = 200) {
    const originalTransition = element.style.transition;
    const originalOpacity = element.style.opacity;
    const originalHeight = element.style.height;
    const originalWidth = element.style.width;
    const originalTransform = element.style.transform;
    const originalOverflow = element.style.overflow;

    element.style.transition = 'none';

    if (effectName === 'fadeIn') {
      element.style.opacity = '0';
      void element.offsetHeight;
      element.style.transition = `opacity ${duration}ms ease-in-out`;
      element.style.opacity = '1';
    } else if (effectName === 'fadeOut') {
      element.style.opacity = '1';
      void element.offsetHeight;
      element.style.transition = `opacity ${duration}ms ease-in-out`;
      element.style.opacity = '0';
    } else if (effectName === 'slideUp') {
      element.style.overflow = 'hidden';
      element.style.height = `${element.scrollHeight}px`;
      void element.offsetHeight;
      element.style.transition = `height ${duration}ms ease-in-out`;
      element.style.height = '0';
    } else if (effectName === 'slideDown') {
      element.style.overflow = 'hidden';
      element.style.height = '0';
      void element.offsetHeight;
      element.style.transition = `height ${duration}ms ease-in-out`;
      element.style.height = `${element.scrollHeight}px`;
    } else if (effectName === 'slideLeft') {
      element.style.overflow = 'hidden';
      element.style.width = `${element.scrollWidth}px`;
      void element.offsetWidth;
      element.style.transition = `width ${duration}ms ease-in-out`;
      element.style.width = '0';
    } else if (effectName === 'slideRight') {
      element.style.overflow = 'hidden';
      element.style.width = '0';
      void element.offsetWidth;
      element.style.transition = `width ${duration}ms ease-in-out`;
      element.style.width = `${element.scrollWidth}px`;
    } else if (effectName === 'zoomIn') {
      element.style.transform = 'scale(0)';
      void element.offsetWidth;
      element.style.transition = `transform ${duration}ms ease-in-out`;
      element.style.transform = 'scale(1)';
    } else if (effectName === 'zoomOut') {
      element.style.transform = 'scale(1)';
      void element.offsetWidth;
      element.style.transition = `transform ${duration}ms ease-in-out`;
      element.style.transform = 'scale(0)';
    } else if (effectName === 'rotate') {
      element.style.transform = 'rotate(0deg)';
      void element.offsetWidth;
      element.style.transition = `transform ${duration}ms ease-in-out`;
      element.style.transform = 'rotate(360deg)';
    }

    setTimeout(() => {
      element.style.transition = originalTransition || '';
      element.style.opacity = originalOpacity || '';
      element.style.height = originalHeight || '';
      element.style.width = originalWidth || '';
      element.style.transform = originalTransform || '';
      element.style.overflow = originalOverflow || '';
    }, duration);
  }

  catch(handler) {
    this.errorHandler = handler;
    return this;
  }

  every(interval, key = null) {
    const intervalValue = this._parseInterval(interval);

    if (key) {
      if (SXObject.intervals.has(key)) {
        clearInterval(SXObject.intervals.get(key));
        SXObject.intervals.delete(key);
      }
    } else {
      if (this.intervalId) clearInterval(this.intervalId);
    }

    const intervalCallback = () => {
      const chain = [];
      if (this.url) {
        chain.push(() => this.formSelector ? this.with(this.formSelector) : this.get(this.url));
      }
      if (this.doFill) chain.push(() => this.fill());
      if (this.swapMethod) chain.push(() => this.swap(this.swapMethod));
      if (this.effectName) chain.push(() => this.effect(this.effectName, this.effectDuration));
      chain.reduce((prev, curr) => prev.then(curr), Promise.resolve());
    };

    const intervalId = setInterval(intervalCallback, intervalValue);

    if (key) {
      SXObject.intervals.set(key, intervalId);
    } else {
      this.intervalId = intervalId;
    }

    return this;
  }

  stop(key) {
    SXObject.stop(key);
    return this;
  }

  static stop(key) {
    if (this.intervals.has(key)) {
      clearInterval(this.intervals.get(key));
      this.intervals.delete(key);
    }
  }

  _parseInterval(interval) {
    if (typeof interval === 'number') {
      return interval;
    }

    const match = interval.match(/^(\d+)(ms|s)$/);
    if (!match) {
      console.error(`Invalid interval format: ${interval}. Use "4s" or "500ms".`);
      return 0;
    }

    const value = parseInt(match[1]);
    const unit = match[2];

    return unit === 's' ? value * 1000 : value;
  }
}
