// placeConfig.js

const NEED_TO_PLACE_TYPES = {
  get_stronger: ["gym", "physical_therapy"],
  injury_rehab: ["physical_therapy", "sports_medicine"],
  heart_concern: ["cardiologist", "primary_care"],
  mental_health: ["therapist", "counseling_center"],
  std_check: ["std_clinic", "community_health_center"],
  general_checkup: ["primary_care", "community_health_center"],
  nutrition: ["dietitian", "nutritionist"],
  chronic_pain: ["pain_clinic", "primary_care"]
};
function getQueriesForNeed(need) {
  return NEED_TO_PLACE_TYPES[need] || NEED_TO_PLACE_TYPES["general_checkup"];
}


module.exports = {
  getQueriesForNeed
};
