module.exports = {
  delay: (time) => {
    return new Promise((resolve) => setTimeout(resolve, time));
  },

  normalizeText: (str) => {
    return str
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }
};
