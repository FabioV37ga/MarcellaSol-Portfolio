import ui from "./ui.view.js";
import { createRoom, confirmedWord } from "../templates/createRoom.template.js";
import { getElements, createRoomElements, getConfirmedWords } from "../selectors/createRoom.selector.js";
import u from "umbrellajs";
import { getRandomWords } from "../utils/wordList.util.js";



class CreateRoomView extends ui {
    elements: createRoomElements

    constructor() {
        super()
        this.render(createRoom())
        this.elements = getElements()
    }

    setWord(input: HTMLElement) {
        this.elements = getElements()
        var word: string;


        input.childNodes.forEach(child => {
            if (child.nodeType === Node.TEXT_NODE) {
                word = child.textContent!.replace(",", "").trim()
                if (word) {

                    this.confirmWord(word, getElements())

                    child.textContent = child.textContent!.replace(word, "").replace(",", "")

                    input.append(document.createTextNode(" "))

                    this.setCursor(input)
                }
            }
        })
    }

    confirmWord(word: string, elements: createRoomElements) {
        // console.log(word)

        elements.wordInput.append(
            confirmedWord(word)
        )

    }

    setCursor(input: HTMLElement) {
        input.focus()

        // garante que existe um TextNode no final
        if (!input.lastChild || input.lastChild.nodeType !== Node.TEXT_NODE) {
            input.appendChild(document.createTextNode(" "))
        }

        const textNode = input.lastChild as Text

        const range = document.createRange()
        const selection = window.getSelection()

        range.setStart(textNode, textNode.length)
        range.collapse(true)

        selection?.removeAllRanges()
        selection?.addRange(range)
    }

    randomizeWords() {

        var renderedWords = getConfirmedWords()

        if (renderedWords) {

            renderedWords.forEach(element => {
                element.remove()
            });

        }

        var randomWords = getRandomWords()! as string[]

        randomWords.forEach(word => {
            this.confirmWord(word, getElements())
        });


    }
}

export default CreateRoomView