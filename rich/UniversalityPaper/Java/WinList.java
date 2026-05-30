import java.awt.*;
import java.awt.event.*;

/**This class allows the program to exit gracefully when you kill the window*/

    public class WinList implements WindowListener{
        Frame F;

        public WinList(Frame F){
            this.F=F;
        }
        
        public void windowDeactivated(java.awt.event.WindowEvent windowEvent) {}
        public void windowDeiconified(java.awt.event.WindowEvent windowEvent) {}
        public void windowIconified(java.awt.event.WindowEvent windowEvent) {}
        public void windowOpened(java.awt.event.WindowEvent windowEvent) {}
        public void windowActivated(java.awt.event.WindowEvent windowEvent) {}
        public void windowClosed(java.awt.event.WindowEvent windowEvent) {}
        public void windowClosing(java.awt.event.WindowEvent windowEvent) {
            F.dispose();
            System.exit(0);
        }
    }


    

