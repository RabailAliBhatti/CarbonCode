import { describe, it, expect } from 'vitest'
import { PROJECT_TEMPLATES } from '../templates/projectTemplates'

describe('Project Starter Templates', () => {
    it('should define all starter templates', () => {
        expect(PROJECT_TEMPLATES).toHaveLength(5)
        const templateIds = PROJECT_TEMPLATES.map(t => t.id)
        expect(templateIds).toContain('cpp-oop')
        expect(templateIds).toContain('cpp-game')
        expect(templateIds).toContain('cpp-turtle')
        expect(templateIds).toContain('python-modular')
        expect(templateIds).toContain('java-standard')
    })

    it('each template should have a valid primary file matching its files list', () => {
        for (const template of PROJECT_TEMPLATES) {
            expect(template.name).toBeTruthy()
            expect(template.description).toBeTruthy()
            expect(template.defaultProjectName).toBeTruthy()
            expect(template.files.length).toBeGreaterThan(0)

            const filePaths = template.files.map(f => f.path)
            expect(filePaths).toContain(template.primaryFile)

            // Each template should include a .carboncode metadata file
            expect(filePaths).toContain('.carboncode')
        }
    })

    describe('C++ OOP Package', () => {
        const cppOop = PROJECT_TEMPLATES.find(t => t.id === 'cpp-oop')!

        it('should have proper multi-file structure with header guards', () => {
            expect(cppOop).toBeDefined()
            expect(cppOop.language).toBe('cpp')
            expect(cppOop.category).toBe('C++')

            const headerFile = cppOop.files.find(f => f.path === 'include/Calculator.h')
            expect(headerFile).toBeDefined()
            expect(headerFile!.content).toContain('#ifndef CALCULATOR_H')
            expect(headerFile!.content).toContain('#define CALCULATOR_H')
            expect(headerFile!.content).toContain('class Calculator')

            const srcFile = cppOop.files.find(f => f.path === 'src/Calculator.cpp')
            expect(srcFile).toBeDefined()
            expect(srcFile!.content).toContain('#include "Calculator.h"')

            const mainFile = cppOop.files.find(f => f.path === 'src/main.cpp')
            expect(mainFile).toBeDefined()
            expect(mainFile!.content).toContain('#include "Calculator.h"')
            expect(mainFile!.content).toContain('int main(')

            const testDriver = cppOop.files.find(f => f.path === 'tests/test_calculator.cpp')
            expect(testDriver).toBeDefined()
            expect(testDriver!.content).toContain('#include <cassert>')
        })
    })

    describe('Raylib 2D Game Starter', () => {
        const game = PROJECT_TEMPLATES.find(t => t.id === 'cpp-game')!

        it('should have 2D game loop and engine architecture', () => {
            expect(game).toBeDefined()
            expect(game.language).toBe('cpp')
            expect(game.category).toBe('Game Dev')

            const gameHeader = game.files.find(f => f.path === 'include/game.h')
            expect(gameHeader).toBeDefined()
            expect(gameHeader!.content).toContain('#ifndef GAME_H')
            expect(gameHeader!.content).toContain('class GameEngine')

            const gameSrc = game.files.find(f => f.path === 'src/game.cpp')
            expect(gameSrc).toBeDefined()
            expect(gameSrc!.content).toContain('void GameEngine::update')
            expect(gameSrc!.content).toContain('void GameEngine::handleInput')

            const mainSrc = game.files.find(f => f.path === 'src/main.cpp')
            expect(mainSrc).toBeDefined()
            expect(mainSrc!.content).toContain('GameEngine game;')
            expect(mainSrc!.content).toContain('game.update(dt);')
        })
    })

    describe('Python Modular Project', () => {
        const pythonMod = PROJECT_TEMPLATES.find(t => t.id === 'python-modular')!

        it('should have modular package structure, virtualenv requirements, and unittests', () => {
            expect(pythonMod).toBeDefined()
            expect(pythonMod.language).toBe('python')
            expect(pythonMod.category).toBe('Python')

            const reqs = pythonMod.files.find(f => f.path === 'requirements.txt')
            expect(reqs).toBeDefined()

            const pkgInit = pythonMod.files.find(f => f.path === 'src/math_suite/__init__.py')
            expect(pkgInit).toBeDefined()

            const pkgCalc = pythonMod.files.find(f => f.path === 'src/math_suite/calculator.py')
            expect(pkgCalc).toBeDefined()
            expect(pkgCalc!.content).toContain('class AdvancedCalculator:')

            const mainPy = pythonMod.files.find(f => f.path === 'main.py')
            expect(mainPy).toBeDefined()
            expect(mainPy!.content).toContain('from math_suite import AdvancedCalculator')

            const testPy = pythonMod.files.find(f => f.path === 'tests/test_calculator.py')
            expect(testPy).toBeDefined()
            expect(testPy!.content).toContain('import unittest')
            expect(testPy!.content).toContain('class TestCalculator(unittest.TestCase):')
        })
    })

    describe('Java Standard Application', () => {
        const javaApp = PROJECT_TEMPLATES.find(t => t.id === 'java-standard')!

        it('should have package-aware layout with model and service layers', () => {
            expect(javaApp).toBeDefined()
            expect(javaApp.language).toBe('java')
            expect(javaApp.category).toBe('Java')

            const mainJava = javaApp.files.find(f => f.path === 'src/com/carboncode/app/Main.java')
            expect(mainJava).toBeDefined()
            expect(mainJava!.content).toContain('package com.carboncode.app;')
            expect(mainJava!.content).toContain('public class Main')

            const modelJava = javaApp.files.find(f => f.path === 'src/com/carboncode/app/model/Product.java')
            expect(modelJava).toBeDefined()
            expect(modelJava!.content).toContain('package com.carboncode.app.model;')
            expect(modelJava!.content).toContain('public class Product')

            const serviceJava = javaApp.files.find(f => f.path === 'src/com/carboncode/app/service/ProductService.java')
            expect(serviceJava).toBeDefined()
            expect(serviceJava!.content).toContain('package com.carboncode.app.service;')
            expect(serviceJava!.content).toContain('public class ProductService')
        })
    })
})
