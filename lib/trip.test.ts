import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyDetails, mergeDetails, readDetails } from "./trip.ts";

const flight = (over = {}) => ({ date: "2026-11-07", flight_no: "MF 8656", from: "KUL", to: "CSX", depart: "14:40", arrive: "19:40", booking_ref: null, ...over });

test("bekräftelse fyller på bokningsnumret på samma flyg", () => {
  const current = { ...emptyDetails(), flights: [flight(), flight({ date: "2026-11-15", flight_no: "MF 8655" })] };
  const merged = mergeDetails(current, { ...emptyDetails(), flights: [flight({ flight_no: "MF8656", booking_ref: "XK7P2Q", depart: null })] });
  assert.equal(merged.flights.length, 2);
  assert.equal(merged.flights[0].booking_ref, "XK7P2Q");
  assert.equal(merged.flights[0].depart, "14:40");
});

test("nya hotell ersätter, tomma behåller det gamla", () => {
  const current = { ...emptyDetails(), hotels: [{ name: "MAQO", check_in: null, check_out: null, address: null, phone: null }], important: ["Samling 11:40"] };
  assert.equal(mergeDetails(current, emptyDetails()).hotels[0].name, "MAQO");
  const merged = mergeDetails(current, { ...emptyDetails(), hotels: [{ name: "Hilton", check_in: null, check_out: null, address: null, phone: null }], important: ["Samling 11:40", "Pass"] });
  assert.equal(merged.hotels[0].name, "Hilton");
  assert.deepEqual(merged.important, ["Samling 11:40", "Pass"]);
});

test("trasig details i databasen blir tom", () => {
  assert.deepEqual(readDetails(null), emptyDetails());
  assert.deepEqual(readDetails({ flights: "nej" }), emptyDetails());
  assert.equal(readDetails({ flights: [flight()] }).flights.length, 1);
});
