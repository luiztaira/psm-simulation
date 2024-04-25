import fs from "fs";
import csv from "csv-parser";

interface Row {
  [key: string]: string | number;
}

const countIf = (
  objectsArray: Row[],
  propertyName: string,
  condition: (value: number) => boolean
): number => {
  let count = 0;
  for (let i = 0; i < objectsArray.length; i++) {
    const propertyValue = parseFloat(objectsArray[i][propertyName] as string);
    if (!isNaN(propertyValue) && condition(propertyValue)) {
      count++;
    }
  }
  return count;
};

const excelCountAndRatios = (
  objectsArray: Row[],
  columnNames: string[],
  conditions: number[]
): { counts: number[][]; ratios: number[][] } => {
  const counts: number[][] = [];
  const ratios: number[][] = [];

  columnNames.forEach((columnName) => {
    const totalNonEmptyCount = countIf(
      objectsArray,
      columnName,
      (value: string | number) => value !== ""
    );
    const columnCounts: number[] = [];

    for (let j = 0; j < conditions.length; j++) {
      let countCondition =
        columnName === "安い" || columnName === "安すぎる"
          ? (value: number) => value >= conditions[j]
          : (value: number) => value <= conditions[j];
      const count = countIf(objectsArray, columnName, countCondition);
      columnCounts.push(count);
    }

    const columnRatios = columnCounts.map(
      (count) => Math.round((count / totalNonEmptyCount) * 1000) / 10
    );

    counts.push(columnCounts);
    ratios.push(columnRatios);
  });

  return { counts, ratios };
};

const xCoordinate = (
  y1: number,
  y2: number,
  y3: number,
  y4: number,
  conditions: number[],
  intersectionType: string
): number => {
  let x1: number, x2: number, x3: number, x4: number;

  if (intersectionType === "高くて安すぎる") {
    x1 = conditions[3];
    x2 = conditions[4];
    x3 = conditions[3];
    x4 = conditions[4];
  } else {
    x1 = conditions[4];
    x2 = conditions[5];
    x3 = conditions[4];
    x4 = conditions[5];
  }

  const numerator =
    (y3 - y1) * (x1 - x2) * (x3 - x4) +
    x1 * (y1 - y2) * (x3 - x4) -
    x3 * (y3 - y4) * (x1 - x2);
  const denominator = (y1 - y2) * (x3 - x4) - (x1 - x2) * (y3 - y4);

  return numerator / denominator;
};

// Read CSV data and process
const results: Row[] = [];
fs.createReadStream("PSMrawdata.csv")
  .pipe(csv())
  .on("data", (row: Row) => {
    results.push(row);
  })
  .on("end", () => {
    const columnNames: string[] = ["高い", "安い", "高すぎる", "安すぎる"];
    const conditions: number[] = [
      50, 100, 150, 200, 250, 300, 350, 400, 450, 500, 550, 600,
    ];

    const { ratios } = excelCountAndRatios(results, columnNames, conditions);

    const highRatios = ratios[0];
    const lowRatios = ratios[1];
    const tooHighRatios = ratios[2];
    const tooLowRatios = ratios[3];

    const xHighLow = Math.ceil(
      xCoordinate(
        highRatios[4],
        highRatios[5],
        lowRatios[4],
        lowRatios[5],
        conditions,
        "高くて安い"
      )
    );
    const xHighTooLow = Math.ceil(
      xCoordinate(
        highRatios[3],
        highRatios[4],
        tooLowRatios[3],
        tooLowRatios[4],
        conditions,
        "高くて安すぎる"
      )
    );
    const xTooHighLow = Math.ceil(
      xCoordinate(
        tooHighRatios[4],
        tooHighRatios[5],
        lowRatios[4],
        lowRatios[5],
        conditions,
        "高すぎて安い"
      )
    );
    const xTooHighTooLow = Math.ceil(
      xCoordinate(
        tooHighRatios[4],
        tooHighRatios[5],
        tooLowRatios[4],
        tooLowRatios[5],
        conditions,
        "高すぎて安すぎる"
      )
    );

    console.log(`理想価格：${xHighLow}円`);
    console.log(`最低品質保証価格：${xHighTooLow}円`);
    console.log(`最高価格：${xTooHighLow}円`);
    console.log(`妥協価格：${xTooHighTooLow}円`);
  });
