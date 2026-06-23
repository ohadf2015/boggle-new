const confetti = () => Promise.resolve(null);
confetti.reset = () => {};
confetti.create = () => confetti;
export default confetti;
module.exports = confetti;
