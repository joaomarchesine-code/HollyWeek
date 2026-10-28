import { Subject, GradeCalculationResult } from '../types';

export const calculateNeededGrades = (subject: Subject): GradeCalculationResult => {
  const { components, passingScore, formula } = subject.gradingMethod;
  const gradesMap = new Map<string, number | null>();

  subject.grades.forEach((g) => {
    gradesMap.set(g.componentId, g.value);
  });

  const totalComponents = components.length;
  if (totalComponents === 0) {
    return {
      currentAverage: 0,
      totalComponents: 0,
      completedComponents: 0,
      isPassing: false,
      isImpossible: false,
      isCompleted: false,
      statusText: 'Sem avaliações cadastradas',
      neededGrades: [],
    };
  }

  const completedComponentsList = components.filter(
    (c) => gradesMap.has(c.id) && gradesMap.get(c.id) !== null && gradesMap.get(c.id) !== undefined
  );
  const missingComponentsList = components.filter(
    (c) => !gradesMap.has(c.id) || gradesMap.get(c.id) === null || gradesMap.get(c.id) === undefined
  );

  const k = completedComponentsList.length;
  const n = totalComponents;
  const isCompleted = k === n;

  if (formula === 'average') {
    const somaAtual = completedComponentsList.reduce((acc, c) => acc + (gradesMap.get(c.id) ?? 0), 0);
    const currentAverage = k > 0 ? Number((somaAtual / k).toFixed(2)) : 0;

    if (isCompleted) {
      const finalAverage = Number((somaAtual / n).toFixed(2));
      const isPassing = finalAverage >= passingScore;
      return {
        currentAverage: finalAverage,
        totalComponents: n,
        completedComponents: k,
        isPassing,
        isImpossible: !isPassing,
        isCompleted: true,
        statusText: isPassing ? 'Aprovado! 🎉' : 'Reprovado 😢',
        neededGrades: [],
      };
    }

    const somaFaltanteNecessaria = passingScore * n - somaAtual;
    const missingCount = n - k;

    // Se a soma já garante aprovação mesmo tirando 0 no restante
    if (somaFaltanteNecessaria <= 0) {
      return {
        currentAverage,
        totalComponents: n,
        completedComponents: k,
        isPassing: true,
        isImpossible: false,
        isCompleted: false,
        statusText: 'Você já está aprovado! 🎉',
        neededGrades: missingComponentsList.map((c) => ({
          componentId: c.id,
          componentName: c.name,
          neededGrade: 0,
        })),
      };
    }

    // Se mesmo tirando 10 em todas as faltantes não alcançar passingScore
    const maxPossivelSomaFaltante = missingCount * 10;
    if (somaFaltanteNecessaria > maxPossivelSomaFaltante) {
      return {
        currentAverage,
        totalComponents: n,
        completedComponents: k,
        isPassing: false,
        isImpossible: true,
        isCompleted: false,
        statusText: 'Não é mais possível passar 😢',
        neededGrades: missingComponentsList.map((c) => ({
          componentId: c.id,
          componentName: c.name,
          neededGrade: 10,
        })),
      };
    }

    // Nota média necessária por componente restante
    const neededGradeEach = Math.max(0, Math.min(10, Number((somaFaltanteNecessaria / missingCount).toFixed(1))));

    // Nota mínima necessária supondo nota 10 nos demais faltantes
    const neededGrades = missingComponentsList.map((c) => {
      const otherMissingCount = missingCount - 1;
      const minNeededAssumingTen = somaFaltanteNecessaria - otherMissingCount * 10;
      const needed = Math.max(0, Math.min(10, Number(minNeededAssumingTen.toFixed(1))));
      // Usamos a nota balanceada se minNeeded <= 0 para dar uma meta realista, ou a mínima
      const displayNeeded = needed > 0 ? needed : neededGradeEach;
      return {
        componentId: c.id,
        componentName: c.name,
        neededGrade: displayNeeded,
      };
    });

    return {
      currentAverage,
      totalComponents: n,
      completedComponents: k,
      isPassing: false,
      isImpossible: false,
      isCompleted: false,
      statusText: `Precisa de ~${neededGradeEach.toFixed(1)} nas avaliações restantes`,
      neededGrades,
    };
  } else if (formula === 'weighted_average') {
    const totalWeights = components.reduce((acc, c) => acc + (c.weight || 1), 0);
    const completedWeightSum = completedComponentsList.reduce(
      (acc, c) => acc + (c.weight || 1),
      0
    );
    const somaAtualPonderada = completedComponentsList.reduce(
      (acc, c) => acc + (gradesMap.get(c.id) ?? 0) * (c.weight || 1),
      0
    );

    const currentAverage =
      completedWeightSum > 0
        ? Number((somaAtualPonderada / completedWeightSum).toFixed(2))
        : 0;

    if (isCompleted) {
      const finalAverage = Number((somaAtualPonderada / totalWeights).toFixed(2));
      const isPassing = finalAverage >= passingScore;
      return {
        currentAverage: finalAverage,
        totalComponents: n,
        completedComponents: k,
        isPassing,
        isImpossible: !isPassing,
        isCompleted: true,
        statusText: isPassing ? 'Aprovado! 🎉' : 'Reprovado 😢',
        neededGrades: [],
      };
    }

    const missingWeightSum = totalWeights - completedWeightSum;
    const requiredWeightedSum = passingScore * totalWeights - somaAtualPonderada;

    if (requiredWeightedSum <= 0) {
      return {
        currentAverage,
        totalComponents: n,
        completedComponents: k,
        isPassing: true,
        isImpossible: false,
        isCompleted: false,
        statusText: 'Você já está aprovado! 🎉',
        neededGrades: missingComponentsList.map((c) => ({
          componentId: c.id,
          componentName: c.name,
          neededGrade: 0,
        })),
      };
    }

    const maxMissingWeightedSum = missingWeightSum * 10;
    if (requiredWeightedSum > maxMissingWeightedSum) {
      return {
        currentAverage,
        totalComponents: n,
        completedComponents: k,
        isPassing: false,
        isImpossible: true,
        isCompleted: false,
        statusText: 'Não é mais possível passar 😢',
        neededGrades: missingComponentsList.map((c) => ({
          componentId: c.id,
          componentName: c.name,
          neededGrade: 10,
        })),
      };
    }

    const neededGradeAverage = Math.max(
      0,
      Math.min(10, Number((requiredWeightedSum / missingWeightSum).toFixed(1)))
    );

    const neededGrades = missingComponentsList.map((c) => {
      const otherMissingWeight = missingWeightSum - (c.weight || 1);
      const minNeededAssumingTen =
        (requiredWeightedSum - otherMissingWeight * 10) / (c.weight || 1);
      const needed = Math.max(0, Math.min(10, Number(minNeededAssumingTen.toFixed(1))));
      const displayNeeded = needed > 0 ? needed : neededGradeAverage;
      return {
        componentId: c.id,
        componentName: c.name,
        neededGrade: displayNeeded,
      };
    });

    return {
      currentAverage,
      totalComponents: n,
      completedComponents: k,
      isPassing: false,
      isImpossible: false,
      isCompleted: false,
      statusText: `Precisa de ~${neededGradeAverage.toFixed(1)} ponderado nas restantes`,
      neededGrades,
    };
  } else {
    // Formula: 'sum'
    const somaAtual = completedComponentsList.reduce((acc, c) => acc + (gradesMap.get(c.id) ?? 0), 0);
    const currentAverage = somaAtual;

    if (isCompleted) {
      const isPassing = somaAtual >= passingScore;
      return {
        currentAverage: somaAtual,
        totalComponents: n,
        completedComponents: k,
        isPassing,
        isImpossible: !isPassing,
        isCompleted: true,
        statusText: isPassing ? 'Aprovado! 🎉' : 'Reprovado 😢',
        neededGrades: [],
      };
    }

    const falta = passingScore - somaAtual;
    if (falta <= 0) {
      return {
        currentAverage: somaAtual,
        totalComponents: n,
        completedComponents: k,
        isPassing: true,
        isImpossible: false,
        isCompleted: false,
        statusText: 'Você já está aprovado! 🎉',
        neededGrades: missingComponentsList.map((c) => ({
          componentId: c.id,
          componentName: c.name,
          neededGrade: 0,
        })),
      };
    }

    const missingCount = n - k;
    const maxPossivel = missingCount * 10;
    if (falta > maxPossivel) {
      return {
        currentAverage: somaAtual,
        totalComponents: n,
        completedComponents: k,
        isPassing: false,
        isImpossible: true,
        isCompleted: false,
        statusText: 'Não é mais possível passar 😢',
        neededGrades: missingComponentsList.map((c) => ({
          componentId: c.id,
          componentName: c.name,
          neededGrade: 10,
        })),
      };
    }

    const neededEach = Math.max(0, Math.min(10, Number((falta / missingCount).toFixed(1))));
    return {
      currentAverage: somaAtual,
      totalComponents: n,
      completedComponents: k,
      isPassing: false,
      isImpossible: false,
      isCompleted: false,
      statusText: `Faltam ${falta.toFixed(1)} pontos para atingir ${passingScore}`,
      neededGrades: missingComponentsList.map((c) => ({
        componentId: c.id,
        componentName: c.name,
        neededGrade: neededEach,
      })),
    };
  }
};
