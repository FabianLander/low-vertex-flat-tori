/*
 * ResizableFrame.java
 *
 * Created on October 16, 2005, 8:56 PM
 */

import java.awt.*;
import java.awt.event.*;

/**
 * Essentially this class combines a panel with a frame.
 * @author  pat hooper
 */
public class PopupPanel extends Panel implements ComponentListener, WindowListener {
    
    public Frame F;
    
    /** Creates a new instance of PopupFrame */
    public PopupPanel(String windowName, int Width, int Height) {
        F=new Frame(windowName);
        F.add(this);
        F.pack();
        F.addComponentListener(this);
        F.addWindowListener(this);
        F.setSize(Width,Height);
    }
    
    /** Extend this to handle resizing the window */
    public void resized(int width, int height){
    }
    
    public void setVisible(boolean b) {
        // call extended Panel's setVisible function:
        super.setVisible(b);
        F.setVisible(b);
    }
    
    ////////////////// ComponentListener
    
    public void componentHidden(ComponentEvent e) {
    }
    
    public void componentMoved(ComponentEvent e) {
    }
    
    public void componentResized(ComponentEvent e) {
        resized(F.getWidth() - (F.getInsets().left + F.getInsets().right),
        F.getHeight() - (F.getInsets().top + F.getInsets().bottom));
        getLayout().layoutContainer(this);
    }
    
    /* Resize the Window so the width and
     * height are as specified by the constructor */
    public void componentShown(ComponentEvent e) {
        F.setSize(F.getWidth() + (F.getInsets().left + F.getInsets().right),
        F.getHeight() + (F.getInsets().top + F.getInsets().bottom));
    }
    
    
    public void windowActivated(java.awt.event.WindowEvent windowEvent) {
    }
    
    public void windowClosed(java.awt.event.WindowEvent windowEvent) {
    }
    
    public void windowClosing(java.awt.event.WindowEvent windowEvent) {
        F.dispose();
    }
    
    public void windowDeactivated(java.awt.event.WindowEvent windowEvent) {
    }
    
    public void windowDeiconified(java.awt.event.WindowEvent windowEvent) {
    }
    
    public void windowIconified(java.awt.event.WindowEvent windowEvent) {
    }
    
    public void windowOpened(java.awt.event.WindowEvent windowEvent) {
    }
    
}
