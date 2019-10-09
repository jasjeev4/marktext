import { remote } from 'electron'
import log from 'electron-log'
import bus from '@/bus'
import { SEPARATOR } from './menuItems'

const { MenuItem } = remote

export default (spellchecker, selectedWord, wordSuggestions, replaceCallback) => {
  if (spellchecker && spellchecker.isEnabled) {
    const spellingSubmenu = []

    // Change language menu entries
    const currentLanguage = spellchecker.lang
    const availableDictionaries = spellchecker.getAvailableDictionaries()
    const availableDictionariesSubmenu = []
    for (const dict of availableDictionaries) {
      availableDictionariesSubmenu.push(new MenuItem({
        label: dict,
        enabled: dict !== currentLanguage,
        click () {
          bus.$emit('switch-spellchecker-language', dict)
        }
      }))
    }

    spellingSubmenu.push(new MenuItem({
      label: 'Change Language...',
      submenu: availableDictionariesSubmenu
    }))

    // TODO(spell): Delete me
    spellingSubmenu.push(new MenuItem({
      label: 'Debug',
      click (menuItem, browserWindow) {
        alert(JSON.stringify(spellchecker.getConfiguration, null, 2))
      }
    }))

    spellingSubmenu.push(SEPARATOR)

    // Word suggestions
    if (selectedWord && wordSuggestions && wordSuggestions.length > 0) {
      spellingSubmenu.push({
        label: 'Add to Dictionary',
        click (menuItem, targetWindow) {
          // NOTE: Need to notify Chromium to invalidate the spelling underline.
          targetWindow.webContents.replaceMisspelling(selectedWord)
          spellchecker.addToDictionary(selectedWord)
            .catch(error => {
              log.error(`Error while adding "${selectedWord}" to dictionary.`)
              log.error(error)
            })
        }
      })
      spellingSubmenu.push(SEPARATOR)
      for (const word of wordSuggestions) {
        spellingSubmenu.push({
          label: word,
          click () {
            console.log(`We'll replace "${word}".`) // // TODO(spell): Delete me

            // Notify Muya to replace the word. We cannot just use Chromium to
            // replace the word because the change is not forwarded to Muya.
            replaceCallback(word)
          }
        })
      }
    } else {
      spellingSubmenu.push({
        label: 'Remove from Dictionary',
        // NOTE: We cannot validate that the word is inside the user dictionary.
        enabled: !!selectedWord && selectedWord.length >= 2,
        click (menuItem, targetWindow) {
          // NOTE: Need to notify Chromium to invalidate the spelling underline.
          targetWindow.webContents.replaceMisspelling(selectedWord)
          spellchecker.removeFromDictionary(selectedWord)
            .catch(error => {
              log.error(`Error while removing "${selectedWord}" from dictionary.`)
              log.error(error)
            })
        }
      })
    }
    return spellingSubmenu
  }
  return null
}
